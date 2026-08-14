-- El navegador NUNCA habla con Supabase. Todo acceso ocurre en el servidor
-- de Next.js con la service_role key, que ignora RLS por diseño.
-- Habilitamos RLS SIN políticas: si la anon key se filtrara, no lee ni escribe nada.

alter table public.categories     enable row level security;
alter table public.products       enable row level security;
alter table public.product_images enable row level security;
alter table public.orders         enable row level security;
alter table public.order_items    enable row level security;

-- Cinturón y tirantes: revocar privilegios de tabla a los roles públicos.
revoke all on public.categories,
              public.products,
              public.product_images,
              public.orders,
              public.order_items
  from anon, authenticated;
