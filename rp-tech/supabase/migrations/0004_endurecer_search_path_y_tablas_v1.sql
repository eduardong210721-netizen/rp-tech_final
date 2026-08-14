-- Añadida tras aplicar 0001-0003: el linter de seguridad de Supabase marcó dos cosas.

-- 1. touch_updated_at tenía search_path mutable. No es SECURITY DEFINER, así que el
--    riesgo es menor, pero fijarlo impide que un search_path manipulado resuelva
--    now() a otra función.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- 2. products_v1 (la tabla del sistema viejo, renombrada) y sales heredaron las
--    políticas permisivas "FOR ALL USING (true) WITH CHECK (true)": cualquiera con la
--    anon key pública podía leerlas y escribirlas. Ahora son archivo histórico y se
--    cierran por completo.
drop policy if exists "Acceso publico productos" on public.products_v1;
drop policy if exists "Acceso público productos" on public.products_v1;
drop policy if exists "Acceso publico ventas"    on public.sales;
drop policy if exists "Acceso público ventas"    on public.sales;

alter table public.products_v1 enable row level security;
alter table public.sales       enable row level security;

revoke all on public.products_v1, public.sales from anon, authenticated;
