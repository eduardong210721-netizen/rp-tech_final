# Respaldo del Supabase v1 antes de la reconstrucción

**Proyecto:** `ijxgultrjfxmgkzhfrks` — "eduardong210721-netizen's Project"
**Fecha del respaldo:** 2026-08-13
**Contenido:** `public.products` (10 filas) · `public.sales` (**0 filas**)

Los datos de `products` están en `catalogo-produccion-live.json` (idénticos, verificados
campo por campo contra la base). `sales` estaba vacía: no se perdió ninguna venta.

## Cómo revertir

No se borró nada. La tabla original se **renombró**, no se eliminó:

```sql
-- Deshacer la reconstrucción y devolver el sitio viejo a funcionar:
drop table if exists public.order_items, public.orders, public.product_images,
                     public.products, public.categories cascade;
drop type if exists public.order_estado;
drop sequence if exists public.order_codigo_seq;
drop function if exists public.crear_pedido(text,text,text,text,jsonb);
alter table public.products_v1 rename to products;
```

`public.sales` no se tocó: sigue exactamente como estaba.
