-- Ajuste relativo, nunca absoluto: dos admins ajustando a la vez no se pisan.
create or replace function public.ajustar_stock(p_product_id uuid, p_delta int)
returns int
language plpgsql security definer set search_path = public
as $$
declare v_nuevo int;
begin
  update public.products
     set stock = stock + p_delta
   where id = p_product_id
     and stock + p_delta >= 0
  returning stock into v_nuevo;

  if not found then
    raise exception 'AJUSTE_INVALIDO';
  end if;
  return v_nuevo;
end;
$$;

revoke all on function public.ajustar_stock(uuid,int) from public, anon, authenticated;
