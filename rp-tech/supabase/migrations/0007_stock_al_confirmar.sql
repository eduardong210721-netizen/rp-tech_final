-- ============================================================
-- El stock se descuenta al CONFIRMAR el pedido, no al registrarlo.
--
-- Motivo, en palabras del dueño: "es raro que el stock se descuente,
-- solo hice una prueba pidiendo por WhatsApp, todavía no se confirmó
-- la venta".
--
-- Tiene razón, y el diseño original estaba mal. Un pedido registrado
-- no es una venta: es una intención. El cliente llena el formulario,
-- se le abre WhatsApp, y a partir de ahí puede no enviar el mensaje
-- nunca. Con el modelo anterior esa unidad quedaba bloqueada hasta que
-- alguien se diera cuenta y cancelara el pedido a mano.
--
-- QUÉ SE GANA
--   · El stock refleja lo que hay en el estante, no lo que alguien
--     pensó en comprar.
--   · Un checkout abandonado ya no inmoviliza inventario.
--   · Desaparece un vector de abuso real: `crear_pedido` era invocable
--     sin autenticación, así que un script podía poner en cero todo el
--     catálogo enviando pedidos. Ahora el checkout público no toca la
--     columna `stock` en absoluto; solo la toca el dueño autenticado.
--
-- QUÉ SE PIERDE, Y HAY QUE SABERLO
--   Entre que se registra un pedido y se confirma, el stock sigue
--   disponible para otros. Dos clientes pueden pedir la última unidad
--   y ambos recibir confirmación de pedido. `confirmar_pedido` falla
--   con STOCK_INSUFICIENTE en el segundo, así que la base nunca queda
--   inconsistente — pero el dueño tendrá que avisarle a ese cliente.
--   A cambio, ya no ocurre el caso mucho más frecuente de inventario
--   congelado por pedidos que nunca se concretaron.
-- ============================================================

-- ------------------------------------------------------------
-- 1. crear_pedido deja de descontar.
--
-- Sigue validando disponibilidad para no registrar un pedido de algo
-- agotado (sería engañar al cliente), y sigue leyendo el precio de la
-- tabla: el cliente nunca lo envía. Lo que ya no hace es escribir en
-- `stock`.
--
-- Ya no hace falta `FOR UPDATE`: sin decremento no hay invariante que
-- proteger aquí. El bloqueo se mudó a confirmar_pedido, que es donde
-- ahora vive la resta.
-- ------------------------------------------------------------
create or replace function public.crear_pedido(
  p_cliente_nombre   text,
  p_cliente_telefono text,
  p_distrito         text,
  p_referencia       text,
  p_items            jsonb
)
-- El orden de columnas debe ser IDÉNTICO al existente (order_id, codigo,
-- token, subtotal): `create or replace` no puede cambiar el tipo de retorno,
-- y la aplicación lee estos campos por nombre desde este contrato.
returns table (order_id uuid, codigo text, token uuid, subtotal numeric)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid;
  v_codigo   text;
  v_token    uuid;
  v_subtotal numeric(10,2) := 0;
  v_item     jsonb;
  v_producto public.products%rowtype;
  v_cantidad int;
begin
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'PEDIDO_VACIO';
  end if;

  if jsonb_array_length(p_items) > 50 then
    raise exception 'PEDIDO_DEMASIADO_GRANDE';
  end if;

  v_codigo := 'RP-' || to_char(now() at time zone 'America/Lima', 'YYYY') || '-'
              || lpad(nextval('public.order_codigo_seq')::text, 4, '0');

  insert into public.orders (codigo, cliente_nombre, cliente_telefono, distrito, referencia)
  values (v_codigo, p_cliente_nombre, p_cliente_telefono, p_distrito, p_referencia)
  returning id, token into v_order_id, v_token;

  for v_item in
    select t.value
      from jsonb_array_elements(p_items) as t(value)
     order by t.value->>'sku'
  loop
    v_cantidad := (v_item->>'cantidad')::int;
    if v_cantidad is null or v_cantidad < 1 then
      raise exception 'CANTIDAD_INVALIDA:%', coalesce(v_item->>'sku','?');
    end if;

    select * into v_producto
      from public.products
     where sku = (v_item->>'sku') and activo = true;

    if not found then
      raise exception 'PRODUCTO_NO_DISPONIBLE:%', v_item->>'sku';
    end if;

    -- Cortesía, no invariante: evita registrar un pedido de algo que ya
    -- no hay. Que sea aproximado es aceptable — la verdad se comprueba
    -- al confirmar, que es cuando la resta ocurre de verdad.
    if not v_producto.bajo_pedido and v_producto.stock < v_cantidad then
      raise exception 'STOCK_INSUFICIENTE:%:%', v_producto.sku, v_producto.stock;
    end if;

    insert into public.order_items
      (order_id, product_id, sku, nombre, precio_unitario, cantidad, stock_descontado)
    values
      (v_order_id, v_producto.id, v_producto.sku, v_producto.nombre,
       v_producto.precio, v_cantidad, false);

    v_subtotal := v_subtotal + (v_producto.precio * v_cantidad);
  end loop;

  update public.orders set subtotal = v_subtotal where id = v_order_id;

  return query select v_order_id, v_codigo, v_token, v_subtotal;
end;
$$;

revoke all on function public.crear_pedido(text,text,text,text,jsonb)
  from public, anon, authenticated;

-- ------------------------------------------------------------
-- 2. confirmar_pedido: aquí vive ahora la resta de stock.
--
-- Toda la disciplina que antes estaba en crear_pedido se muda aquí:
-- bloqueo de fila con FOR UPDATE, orden canónico por SKU para no
-- provocar interbloqueos entre dos confirmaciones simultáneas, resta
-- relativa con guarda, y excepción si no alcanza. Todo en una sola
-- transacción: o se confirma entero o no se confirma.
-- ------------------------------------------------------------
create or replace function public.confirmar_pedido(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_estado   public.order_estado;
  v_item     record;
  v_producto public.products%rowtype;
begin
  select estado into v_estado
    from public.orders where id = p_order_id for update;

  if not found then
    raise exception 'PEDIDO_NO_EXISTE';
  end if;

  if v_estado <> 'pendiente' then
    raise exception 'PEDIDO_NO_PENDIENTE:%', v_estado;
  end if;

  for v_item in
    select i.id as item_id, i.sku, i.cantidad, i.product_id
      from public.order_items i
     where i.order_id = p_order_id
     order by i.sku
  loop
    -- Producto borrado del catálogo después del pedido: no hay stock
    -- que mover, pero la línea histórica se conserva.
    if v_item.product_id is null then
      continue;
    end if;

    select * into v_producto
      from public.products where id = v_item.product_id for update;

    if not found then
      continue;
    end if;

    -- Bajo pedido no maneja stock: se queda con stock_descontado = false
    -- para que una cancelación posterior no invente inventario.
    if v_producto.bajo_pedido then
      continue;
    end if;

    update public.products
       set stock = stock - v_item.cantidad
     where id = v_producto.id
       and stock >= v_item.cantidad;

    if not found then
      raise exception 'STOCK_INSUFICIENTE:%:%', v_producto.sku, v_producto.stock;
    end if;

    update public.order_items
       set stock_descontado = true
     where id = v_item.item_id;
  end loop;

  update public.orders set estado = 'confirmado' where id = p_order_id;
end;
$$;

revoke all on function public.confirmar_pedido(uuid) from public, anon, authenticated;

-- ------------------------------------------------------------
-- 3. Compromiso pendiente por producto.
--
-- Como el stock ya no se reserva al pedir, el dueño necesita ver
-- cuántas unidades tiene comprometidas en pedidos sin confirmar. Sin
-- esto, la contrapartida del cambio sería invisible hasta que un
-- cliente se quede sin su producto.
-- ------------------------------------------------------------
create or replace view public.stock_comprometido as
select p.id   as product_id,
       p.sku,
       p.nombre,
       p.stock,
       coalesce(
         sum(i.cantidad) filter (
           where o.estado = 'pendiente' and i.stock_descontado = false
         ), 0
       )::int as comprometido,
       (p.stock - coalesce(
         sum(i.cantidad) filter (
           where o.estado = 'pendiente' and i.stock_descontado = false
         ), 0
       ))::int as disponible_real
  from public.products p
  left join public.order_items i on i.product_id = p.id
  left join public.orders o      on o.id = i.order_id
 group by p.id, p.sku, p.nombre, p.stock;

revoke all on public.stock_comprometido from anon, authenticated;
