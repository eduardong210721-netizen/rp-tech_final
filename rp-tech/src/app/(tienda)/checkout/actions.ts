'use server'

import { supabaseAdmin } from '@/lib/supabase/admin'
import { checkoutSchema, mensajeDeError } from '@/lib/domain/order'
import { buildWhatsAppMessage, whatsappUrl } from '@/lib/whatsapp'

export type CheckoutResult =
  | { ok: true; codigo: string; token: string; whatsappUrl: string }
  | { ok: false; error: string }

// `mensajeDeError` vive en @/lib/domain/order (Task 3) para poder testearlo:
// un archivo 'use server' no se puede importar desde Vitest.

type FilaPedido = { order_id: string; codigo: string; token: string; subtotal: number | string }
type FilaItem = { sku: string; nombre: string; precio_unitario: number | string; cantidad: number }

/**
 * Único punto de entrada para crear un pedido. El cliente solo puede mandar
 * `{sku, cantidad}` por item (checkoutSchema descarta cualquier otro campo,
 * como `precio` o `total`, con .strip() implícito de Zod): el precio y el
 * descuento de stock ocurren SIEMPRE dentro de `crear_pedido` en Postgres,
 * bajo `FOR UPDATE`. Esta acción no lee ni escribe `products` directamente.
 */
export async function crearPedidoAction(input: unknown): Promise<CheckoutResult> {
  const parsed = checkoutSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }
  }
  const datos = parsed.data
  const db = supabaseAdmin()

  // El cliente solo mandó {sku, cantidad}. Los precios y el stock los decide
  // la función SQL, que además revoca su ejecución a anon/authenticated:
  // solo la service_role key (este servidor) puede invocarla.
  const { data, error } = await db.rpc('crear_pedido', {
    p_cliente_nombre: datos.cliente_nombre,
    p_cliente_telefono: datos.cliente_telefono,
    p_distrito: datos.distrito,
    p_referencia: datos.referencia ?? null,
    p_items: datos.items,
  })

  if (error) return { ok: false, error: mensajeDeError(error.message) }

  // crear_pedido está declarada `returns table (...)`: supabase-js siempre
  // entrega un array para funciones tabulares, nunca un escalar.
  const fila = (Array.isArray(data) ? data[0] : data) as FilaPedido | undefined
  if (!fila) return { ok: false, error: 'No pudimos registrar tu pedido. Intenta de nuevo.' }

  const { data: items, error: itemsErr } = await db
    .from('order_items')
    .select('sku, nombre, precio_unitario, cantidad')
    .eq('order_id', fila.order_id)

  // El pedido YA existe en la base (stock ya descontado): no es una falla del
  // checkout, es una falla al armar el mensaje. Devolver ok:false aquí haría
  // que el cliente reintente y compre dos veces. En su lugar, confirmamos el
  // éxito con un mensaje de respaldo; /pedido/[token] puede reconstruirlo.
  const itemsParaMensaje: FilaItem[] =
    !itemsErr && items && items.length > 0
      ? (items as FilaItem[])
      : datos.items.map((i) => ({ sku: i.sku, nombre: i.sku, precio_unitario: 0, cantidad: i.cantidad }))

  const mensaje = buildWhatsAppMessage({
    codigo: fila.codigo,
    cliente_nombre: datos.cliente_nombre,
    cliente_telefono: datos.cliente_telefono,
    distrito: datos.distrito,
    referencia: datos.referencia ?? null,
    subtotal: Number(fila.subtotal),
    items: itemsParaMensaje.map((i) => ({ ...i, precio_unitario: Number(i.precio_unitario) })),
  })

  // El token (uuid aleatorio, no el código secuencial) es lo que identifica
  // el pedido en la URL pública /pedido/[token]: ver 0006_orders_token.sql.
  return { ok: true, codigo: fila.codigo, token: fila.token, whatsappUrl: whatsappUrl(mensaje) }
}
