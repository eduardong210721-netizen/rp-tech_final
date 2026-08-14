-- Dos defectos de 0007, encontrados al construir la pantalla de pedidos.
--
-- 1) confirmar_pedido restaba TODAS las líneas sin mirar stock_descontado.
--    Lo tapaba la guarda de estado 'pendiente', pero es defensa de una sola
--    capa: cualquier camino futuro que devolviera un pedido a pendiente
--    permitiría restar el inventario dos veces. La condición correcta vive en
--    SQL, no en la confianza de que nadie escriba ese camino.
--
-- 2) cancelar_pedido devolvía el stock pero dejaba stock_descontado en true,
--    así que la columna mentía: decía "está descontado" sobre unidades que ya
--    habían vuelto al almacén. Cualquiera que leyera esa columna sin cruzarla
--    con el estado del pedido sacaría la conclusión contraria.
--
-- Verificado contra la base: inicio=6 → confirmar=4 → cancelar=6, con la
-- bandera de vuelta en false.

create or replace function public.confirmar_pedido(p_order_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_estado public.order_estado;
  v_item record;
  v_producto public.products%rowtype;
begin
  select estado into v_estado from public.orders where id = p_order_id for update;
  if not found then raise exception 'PEDIDO_NO_EXISTE'; end if;
  if v_estado <> 'pendiente' then
    raise exception 'PEDIDO_NO_PENDIENTE:%', v_estado;
  end if;

  for v_item in
    select i.id as item_id, i.sku, i.cantidad, i.product_id
      from public.order_items i
     where i.order_id = p_order_id
       -- Nunca restar dos veces la misma línea.
       and i.stock_descontado = false
     order by i.sku
  loop
    if v_item.product_id is null then continue; end if;

    select * into v_producto from public.products
     where id = v_item.product_id for update;
    if not found then continue; end if;
    if v_producto.bajo_pedido then continue; end if;

    update public.products set stock = stock - v_item.cantidad
     where id = v_producto.id and stock >= v_item.cantidad;
    if not found then
      raise exception 'STOCK_INSUFICIENTE:%:%', v_producto.sku, v_producto.stock;
    end if;

    update public.order_items set stock_descontado = true where id = v_item.item_id;
  end loop;

  update public.orders set estado = 'confirmado' where id = p_order_id;
end;
$$;

revoke all on function public.confirmar_pedido(uuid) from public, anon, authenticated;

create or replace function public.cancelar_pedido(p_order_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_estado public.order_estado;
  v_item   record;
begin
  select estado into v_estado from public.orders where id = p_order_id for update;
  if not found then raise exception 'PEDIDO_NO_EXISTE'; end if;
  if v_estado = 'cancelado' then raise exception 'PEDIDO_YA_CANCELADO'; end if;

  for v_item in
    select oi.id as item_id, oi.product_id, oi.cantidad
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

    -- La unidad volvió al almacén: la bandera tiene que decir la verdad.
    update public.order_items
       set stock_descontado = false
     where id = v_item.item_id;
  end loop;

  update public.orders set estado = 'cancelado' where id = p_order_id;
end;
$$;

revoke all on function public.cancelar_pedido(uuid) from public, anon, authenticated;
