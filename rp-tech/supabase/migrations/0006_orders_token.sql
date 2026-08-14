-- 0006: token de pedido (deja de exponer el código secuencial en la URL),
-- flag de stock_descontado por item (para no devolver stock que nunca se
-- descontó) y cancelar_pedido() atómica (reemplaza el loop no transaccional
-- que vivía en el Server Action de administración).

-- 1. Token: /pedido/[codigo] es adivinable (RP-2026-0001, 0002, 0003...) y la
--    página no verifica autenticación ni dueño -- cualquiera que recorra la
--    secuencia lee nombre, teléfono, distrito y referencia de cada cliente.
--    Un uuid aleatorio por pedido no se puede adivinar; el código sigue
--    siendo la etiqueta legible que se muestra en pantalla.
alter table public.orders
  add column token uuid not null default gen_random_uuid();

create unique index orders_token_idx on public.orders (token);

-- 2. stock_descontado: crear_pedido salta el descuento cuando el producto es
--    bajo_pedido. Leer products.bajo_pedido al cancelar sería incorrecto: ese
--    flag pudo cambiar después de que el pedido se creó. Se graba la
--    decisión que realmente se tomó, en el momento en que se tomó.
alter table public.order_items
  add column stock_descontado boolean not null default true;

-- 3. crear_pedido: agrega `token` al resultado y graba stock_descontado por
--    item. El resto del cuerpo es BYTE-IDÉNTICO al de 0003_crear_pedido.sql:
--    mismo FOR UPDATE, mismo orden canónico por sku, mismo decremento
--    relativo con el guard `stock >= v_cantidad`, mismo security definer y
--    search_path. Postgres no permite cambiar el tipo de retorno de una
--    función con CREATE OR REPLACE (los argumentos no cambian, así que
--    tampoco cambia la firma que usa `revoke` más abajo): hay que borrarla y
--    crearla de nuevo.
drop function public.crear_pedido(text, text, text, text, jsonb);

create function public.crear_pedido(
  p_cliente_nombre   text,
  p_cliente_telefono text,
  p_distrito         text,
  p_referencia       text,
  p_items            jsonb   -- [{"sku":"26002","cantidad":2}, ...]
)
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

  v_codigo := 'RP-' || to_char(now(), 'YYYY') || '-'
              || lpad(nextval('public.order_codigo_seq')::text, 4, '0');

  -- `returning id, token` (sin calificar) sería ambiguo: `returns table(...,
  -- token uuid, ...)` declara "token" como variable de salida implícita en
  -- TODA la función, y choca con la columna orders.token del INSERT. Se
  -- califica con el nombre de la tabla para desambiguar a favor de la
  -- columna real.
  insert into public.orders (codigo, cliente_nombre, cliente_telefono, distrito, referencia)
  values (v_codigo, p_cliente_nombre, p_cliente_telefono, p_distrito, p_referencia)
  returning orders.id, orders.token into v_order_id, v_token;

  -- Ordenar por SKU antes de bloquear. Sin esto, dos pedidos concurrentes que
  -- compartan dos productos en orden inverso se bloquean mutuamente y Postgres
  -- aborta uno con deadlock_detected. Un orden canónico elimina esa clase entera.
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
     where sku = (v_item->>'sku') and activo = true
     for update;

    if not found then
      raise exception 'PRODUCTO_NO_DISPONIBLE:%', v_item->>'sku';
    end if;

    if not v_producto.bajo_pedido then
      update public.products
         set stock = stock - v_cantidad
       where id = v_producto.id
         and stock >= v_cantidad;

      if not found then
        raise exception 'STOCK_INSUFICIENTE:%:%', v_producto.sku, v_producto.stock;
      end if;
    end if;

    insert into public.order_items
      (order_id, product_id, sku, nombre, precio_unitario, cantidad, stock_descontado)
    values
      (v_order_id, v_producto.id, v_producto.sku, v_producto.nombre,
       v_producto.precio, v_cantidad, not v_producto.bajo_pedido);

    v_subtotal := v_subtotal + (v_producto.precio * v_cantidad);
  end loop;

  update public.orders set subtotal = v_subtotal where id = v_order_id;

  return query select v_order_id, v_codigo, v_token, v_subtotal;
end;
$$;

revoke all on function public.crear_pedido(text,text,text,text,jsonb) from public, anon, authenticated;

-- 4. cancelar_pedido: mueve la cancelación completa a una sola transacción en
--    Postgres. La versión anterior (en el Server Action de /admin/pedidos)
--    hacía un loop de llamadas a ajustar_stock() DESCARTANDO el resultado y
--    luego, en una sentencia aparte, cambiaba el estado. Eso permitía tres
--    resultados incorrectos: (a) un fallo del RPC dejaba el stock sin
--    devolver mientras la action igual respondía {ok:true} -- éxito falso;
--    (b) un fallo a mitad de loop dejaba devolución parcial con el pedido ya
--    cancelado; (c) si la devolución salía bien pero el UPDATE de estado
--    fallaba, la action respondía {ok:false} con el pedido todavía
--    'pendiente', y un reintento devolvía el mismo stock una segunda vez.
create function public.cancelar_pedido(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_estado public.order_estado;
  v_item   record;
begin
  select estado into v_estado
    from public.orders
   where id = p_order_id
   for update;

  if not found then
    raise exception 'PEDIDO_NO_EXISTE';
  end if;

  if v_estado = 'cancelado' then
    raise exception 'PEDIDO_YA_CANCELADO';
  end if;

  -- Mismo orden canónico por sku que crear_pedido: evita abrir una nueva
  -- clase de deadlock contra pedidos concurrentes que bloquean productos.
  -- Solo se devuelve stock a los items que efectivamente lo descontaron.
  for v_item in
    select oi.product_id, oi.cantidad
      from public.order_items oi
      join public.products p on p.id = oi.product_id
     where oi.order_id = p_order_id
       and oi.stock_descontado
     order by p.sku
     for update of p
  loop
    update public.products
       set stock = stock + v_item.cantidad
     where id = v_item.product_id;
  end loop;

  update public.orders set estado = 'cancelado' where id = p_order_id;
end;
$$;

revoke all on function public.cancelar_pedido(uuid) from public, anon, authenticated;
