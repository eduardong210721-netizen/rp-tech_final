-- Crea un pedido y descuenta stock en UNA sola transacción.
-- Los precios se leen SIEMPRE de la tabla products: el cliente no los envía.
-- FOR UPDATE bloquea cada fila, así que dos pedidos simultáneos del último
-- item se serializan y el segundo falla con STOCK_INSUFICIENTE.
create or replace function public.crear_pedido(
  p_cliente_nombre   text,
  p_cliente_telefono text,
  p_distrito         text,
  p_referencia       text,
  p_items            jsonb   -- [{"sku":"26002","cantidad":2}, ...]
)
returns table (order_id uuid, codigo text, subtotal numeric)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid;
  v_codigo   text;
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

  insert into public.orders (codigo, cliente_nombre, cliente_telefono, distrito, referencia)
  values (v_codigo, p_cliente_nombre, p_cliente_telefono, p_distrito, p_referencia)
  returning id into v_order_id;

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
      (order_id, product_id, sku, nombre, precio_unitario, cantidad)
    values
      (v_order_id, v_producto.id, v_producto.sku, v_producto.nombre,
       v_producto.precio, v_cantidad);

    v_subtotal := v_subtotal + (v_producto.precio * v_cantidad);
  end loop;

  update public.orders set subtotal = v_subtotal where id = v_order_id;

  return query select v_order_id, v_codigo, v_subtotal;
end;
$$;

revoke all on function public.crear_pedido(text,text,text,text,jsonb) from public, anon, authenticated;
