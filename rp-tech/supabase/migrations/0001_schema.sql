create extension if not exists "pgcrypto";

create table public.categories (
  id    uuid primary key default gen_random_uuid(),
  slug  text not null unique,
  nombre text not null,
  orden int  not null default 0
);

create table public.products (
  id                uuid primary key default gen_random_uuid(),
  sku               text not null unique,
  slug              text not null unique,
  nombre            text not null,
  descripcion_corta text,
  descripcion_larga text,
  marca             text,
  modelo            text,
  especificaciones  jsonb not null default '[]'::jsonb,
  categoria_id      uuid references public.categories(id) on delete set null,
  precio            numeric(10,2) not null check (precio >= 0),
  costo             numeric(10,2) not null default 0 check (costo >= 0),
  stock             int not null default 0 check (stock >= 0),
  stock_minimo      int not null default 3,
  bajo_pedido       boolean not null default false,
  activo            boolean not null default true,
  garantia_meses    int,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index products_activo_idx    on public.products (activo);
create index products_categoria_idx on public.products (categoria_id);

create table public.product_images (
  id           uuid primary key default gen_random_uuid(),
  product_id   uuid not null references public.products(id) on delete cascade,
  storage_path text not null,
  alt          text not null default '',
  orden        int  not null default 0,
  es_principal boolean not null default false
);

create index product_images_product_idx on public.product_images (product_id, orden);
-- Como MÁXIMO una principal por producto. El índice parcial impide dos, pero no
-- puede exigir que exista al menos una: eso lo garantiza el flujo de carga del admin.
create unique index product_images_max_una_principal
  on public.product_images (product_id) where es_principal;

create type public.order_estado as enum ('pendiente','confirmado','entregado','cancelado');

create sequence public.order_codigo_seq;

create table public.orders (
  id               uuid primary key default gen_random_uuid(),
  codigo           text not null unique,
  cliente_nombre   text not null,
  cliente_telefono text not null,
  distrito         text not null,
  referencia       text,
  subtotal         numeric(10,2) not null default 0,
  estado           public.order_estado not null default 'pendiente',
  created_at       timestamptz not null default now()
);

create table public.order_items (
  id              uuid primary key default gen_random_uuid(),
  order_id        uuid not null references public.orders(id) on delete cascade,
  product_id      uuid references public.products(id) on delete set null,
  sku             text not null,
  nombre          text not null,
  precio_unitario numeric(10,2) not null,
  cantidad        int not null check (cantidad > 0)
);

create index order_items_order_idx on public.order_items (order_id);

-- updated_at automático
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger products_touch_updated_at
  before update on public.products
  for each row execute function public.touch_updated_at();
