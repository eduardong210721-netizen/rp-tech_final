import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { formatPEN } from '@/lib/format'
import { buildWhatsAppMessage, whatsappUrl } from '@/lib/whatsapp'

export const metadata: Metadata = {
  // "Registrado", no "confirmado": el pedido nace en estado pendiente y solo
  // pasa a confirmado cuando el dueño lo aprueba desde el panel.
  title: 'Pedido registrado',
  robots: { index: false, follow: false },
}

type OrderRow = {
  id: string
  codigo: string
  cliente_nombre: string
  cliente_telefono: string
  distrito: string
  referencia: string | null
  subtotal: string | number
  estado: string
}

type ItemRow = { sku: string; nombre: string; precio_unitario: string | number; cantidad: number }

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Página de respaldo: si `window.open(whatsappUrl)` fue bloqueado justo
 * después de confirmar el pedido, este es el único lugar donde el cliente
 * puede recuperar el enlace. Por eso reconstruye el mismo mensaje leyendo
 * `orders`/`order_items` directamente -no depende de nada que haya quedado
 * en memoria del navegador- y el botón es un <a> real: un clic directo del
 * usuario, nunca bloqueado por el navegador.
 *
 * Se busca por `token` (uuid aleatorio, columna `unique`), NUNCA por
 * `codigo`: el código es secuencial y adivinable (RP-2026-0001, 0002, 0003…)
 * y esta página no tiene autenticación ni verificación de dueño. Con el
 * código como clave, cualquiera podía recorrer la secuencia y leer el
 * nombre, teléfono, distrito y referencia de cada cliente que compró alguna
 * vez. El código sigue siendo la etiqueta legible que se muestra en pantalla
 * -solo dejó de ser la clave de búsqueda-.
 *
 * Visualmente es un cierre, no una celebración: el código del pedido en
 * monoespaciada grande es el objeto de la pantalla —es lo que el cliente
 * apunta o lee por teléfono— y todo lo demás lo rodea en voz baja.
 */
export default async function PedidoPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params

  // Un token que no tiene forma de uuid nunca puede coincidir con una fila:
  // se corta aquí para devolver 404 sin tocar la base ni filtrar, vía el
  // mensaje de error de Postgres, que la columna es de tipo uuid.
  if (!UUID_RE.test(token)) notFound()

  const db = supabaseAdmin()

  const { data: pedido, error } = await db
    .from('orders')
    .select('id, codigo, cliente_nombre, cliente_telefono, distrito, referencia, subtotal, estado')
    .eq('token', token)
    .maybeSingle()

  if (error) throw new Error(`PedidoPage: ${error.message}`)
  if (!pedido) notFound()

  const fila = pedido as OrderRow

  const { data: items, error: itemsErr } = await db
    .from('order_items')
    .select('sku, nombre, precio_unitario, cantidad')
    .eq('order_id', fila.id)
    .order('sku')

  if (itemsErr) throw new Error(`PedidoPage/items: ${itemsErr.message}`)

  const itemsRow = (items ?? []) as ItemRow[]
  const subtotal = Number(fila.subtotal)

  const mensaje = buildWhatsAppMessage({
    codigo: fila.codigo,
    cliente_nombre: fila.cliente_nombre,
    cliente_telefono: fila.cliente_telefono,
    distrito: fila.distrito,
    referencia: fila.referencia,
    subtotal,
    items: itemsRow.map((i) => ({ ...i, precio_unitario: Number(i.precio_unitario) })),
  })
  const url = whatsappUrl(mensaje)

  return (
    <div className="mx-auto max-w-2xl px-5 py-14 sm:py-20">
      <p className="eyebrow">Pedido registrado</p>
      <h1 className="mt-4 font-mono text-title text-ink">{fila.codigo}</h1>
      <p className="mt-5 max-w-md text-sm leading-relaxed text-ink-soft">
        {/*
          Antes esto decía "las unidades están separadas para ti". Era falso: el
          stock se descuenta cuando el dueño confirma la venta, no al registrar
          el pedido. Prometer una reserva que no existe es la clase de mentira
          que se paga con un cliente esperando algo que ya se vendió.
        */}
        Guardamos tu pedido con este código: no necesitas volver a enviarlo.
        Escríbenos por WhatsApp para cerrar la compra y coordinar la entrega.
      </p>

      <div className="mt-10 rounded-card border border-hairline">
        <div className="px-6 py-5">
          <p className="eyebrow">Entrega</p>
          <p className="mt-2.5 text-sm text-ink">{fila.cliente_nombre}</p>
          <p className="mt-1 text-sm text-ink-soft">{fila.distrito}</p>
          {fila.referencia ? (
            <p className="mt-1 text-sm leading-relaxed text-ink-muted">{fila.referencia}</p>
          ) : null}
        </div>

        <div className="border-t border-hairline px-6 py-5">
          <p className="eyebrow">Productos</p>
          <ul className="mt-3 divide-y divide-hairline">
            {itemsRow.map((i) => (
              <li key={i.sku} className="flex items-baseline justify-between gap-4 py-3">
                <span className="min-w-0 text-sm leading-snug text-ink-soft">
                  <span className="font-mono text-ink">{i.cantidad}×</span> {i.nombre}
                </span>
                <span className="shrink-0 font-mono text-sm text-ink">
                  {formatPEN(Number(i.precio_unitario) * i.cantidad)}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-4 flex items-baseline justify-between gap-4 border-t border-hairline pt-4">
            <span className="text-sm text-ink-soft">Total</span>
            <span className="font-mono text-heading text-ink">{formatPEN(subtotal)}</span>
          </div>
        </div>
      </div>

      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-8 block rounded-full bg-action px-5 py-3.5 text-center text-sm font-medium text-ink transition-colors duration-(--dur-fast) hover:bg-action-hover"
      >
        Abrir WhatsApp y coordinar la entrega
      </a>
      <p className="mt-3 text-xs leading-relaxed text-ink-muted">
        Si el chat no se abrió solo, este botón lo abre con el resumen ya
        escrito.
      </p>

      <Link
        href="/#catalogo"
        className="mt-8 inline-block border-b border-hairline pb-1 text-sm text-ink-soft transition-colors duration-(--dur-fast) hover:border-signal hover:text-signal"
      >
        Seguir viendo el catálogo
      </Link>
    </div>
  )
}
