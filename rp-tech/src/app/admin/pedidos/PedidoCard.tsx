'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import { formatPEN } from '@/lib/format'
import { cambiarEstadoPedido } from './actions'
import CopiarTexto from './CopiarTexto'
import {
  ETIQUETA_ESTADO,
  notaStockLinea,
  notaStockPedido,
  telefonoLegible,
  unidades,
  unidadesADescontar,
  unidadesADevolver,
  type OrderEstado,
  type OrderItemRow,
  type OrderRow,
} from './vista'

/**
 * Un pedido.
 *
 * Toda la tarjeta está organizada alrededor de una sola decisión: confirmar o
 * no. Confirmar es el momento en que una intención se vuelve una venta y el
 * inventario se mueve, así que es el único botón con color de la pantalla y
 * declara su consecuencia debajo, con el número exacto de unidades.
 *
 * Las acciones son un `<form>` con Server Action y botones que llevan su
 * propio `name="estado"`: un solo formulario resuelve confirmar, entregar y
 * cancelar, y el navegador puede enviarlo aunque el JavaScript no haya
 * cargado todavía.
 */

const BADGE: Record<OrderEstado, string> = {
  pendiente: 'border-action/40 bg-action/10 text-ink',
  confirmado: 'border-signal/40 bg-signal/10 text-signal-ink',
  entregado: 'border-ok/30 bg-ok/10 text-ok',
  cancelado: 'border-hairline bg-paper-alt text-ink-muted',
}

const PUNTO: Record<OrderEstado, string> = {
  pendiente: 'bg-action',
  confirmado: 'bg-signal',
  entregado: 'bg-ok',
  cancelado: 'bg-ink-muted',
}

const BOTON_BASE =
  'inline-flex min-h-11 items-center justify-center rounded-full px-5 text-sm transition-colors duration-(--dur-fast) disabled:cursor-not-allowed disabled:opacity-50'

export default function PedidoCard({
  pedido,
  items,
  fecha,
  monto,
  whatsapp,
  mensajeWhatsapp,
  textoEntrega,
}: {
  pedido: OrderRow
  items: OrderItemRow[]
  fecha: string
  monto: string
  whatsapp: string | null
  mensajeWhatsapp: string
  textoEntrega: string
}) {
  const [resultado, ejecutar, enviando] = useActionState(cambiarEstadoPedido, null)
  // Qué botón se pulsó. Sin esto, cancelar deja al botón de confirmar
  // diciendo "Confirmando…" —un mensaje falso sobre el stock, justo donde
  // menos se puede mentir—.
  const [pulsado, setPulsado] = useState<OrderEstado | null>(null)
  const cargando = (estado: OrderEstado) => enviando && pulsado === estado

  // El estado de la acción se guarda por tarjeta, pero el módulo es el mismo:
  // se comprueba el id antes de mostrar nada.
  const respuesta = resultado && resultado.pedido === pedido.id ? resultado : null

  const porDescontar = unidadesADescontar(items)
  const porDevolver = unidadesADevolver(items)
  const totalUnidades = items.reduce((n, i) => n + i.cantidad, 0)
  const nota = notaStockPedido(pedido.estado, { porDescontar, porDevolver })

  const idNota = `nota-${pedido.id}`

  return (
    <li className="overflow-hidden rounded-2xl border border-hairline bg-paper">
      {/* ── Cabecera: quién, cuándo, cuánto y en qué estado ─────────────── */}
      <div className="px-4 py-4 sm:px-5">
        <div className="flex items-center justify-between gap-3">
          <p className="truncate font-mono text-spec text-ink-muted">{pedido.codigo}</p>
          <span
            className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${BADGE[pedido.estado]}`}
          >
            <span aria-hidden className={`size-1.5 rounded-full ${PUNTO[pedido.estado]}`} />
            {ETIQUETA_ESTADO[pedido.estado]}
          </span>
        </div>
        {/* `ml-auto` en vez de `justify-between`: al envolverse en un teléfono
            el bloque del monto se queda pegado a la derecha igual. */}
        <div className="mt-2 flex flex-wrap items-end gap-x-4 gap-y-2">
          <div className="min-w-0">
            <p className="truncate text-base font-medium text-ink">{pedido.cliente_nombre}</p>
            <p className="mt-1 text-xs text-ink-muted">{fecha}</p>
          </div>
          <p className="ml-auto shrink-0 text-right">
            <span className="eyebrow block">Subtotal · {unidades(totalUnidades)}</span>
            <span className="mt-1.5 block font-mono text-base text-ink">{monto}</span>
          </p>
        </div>
      </div>

      {/* ── Líneas: qué se pidió y si ya movió inventario ───────────────── */}
      <ul className="border-t border-hairline px-4 sm:px-5">
        {items.map((item) => {
          const notaLinea = notaStockLinea(item, pedido.estado)
          return (
            <li
              key={item.id}
              className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1 border-b border-hairline py-3 last:border-b-0"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm text-ink">
                  <span className="font-mono">{item.cantidad}</span> × {item.nombre}
                </p>
                <p className="mt-1 font-mono text-spec text-ink-muted">
                  {item.sku} · {formatPEN(item.precio_unitario)} c/u
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="font-mono text-sm text-ink">
                  {formatPEN(item.precio_unitario * item.cantidad)}
                </p>
                <p
                  className={`mt-1 font-mono text-spec ${notaLinea.descontado ? 'text-ok' : 'text-ink-muted'}`}
                >
                  {notaLinea.texto}
                </p>
              </div>
            </li>
          )
        })}
        {items.length === 0 && (
          <li className="py-3 text-sm text-ink-muted">Este pedido no tiene líneas registradas.</li>
        )}
      </ul>

      {/* ── Entrega: lo que hay que pegar en el chat ────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-t border-hairline px-4 py-4 sm:px-5">
        <div className="min-w-0">
          <p className="eyebrow">Entrega</p>
          <p className="mt-2 text-sm text-ink">{pedido.distrito}</p>
          {pedido.referencia && (
            <p className="mt-1 max-w-prose text-sm text-ink-soft">{pedido.referencia}</p>
          )}
          <p className="mt-1 font-mono text-spec text-ink-muted">
            {telefonoLegible(pedido.cliente_telefono)}
          </p>
        </div>
        <CopiarTexto texto={textoEntrega} etiqueta="Copiar dirección" />
      </div>

      {/* ── Acciones ───────────────────────────────────────────────────── */}
      <div className="border-t border-hairline bg-paper-alt px-4 py-4 sm:px-5">
        <form action={ejecutar}>
          <input type="hidden" name="orderId" value={pedido.id} />

          {pedido.estado === 'pendiente' ? (
            <div className="flex flex-col gap-2">
              <button
                type="submit"
                name="estado"
                value="confirmado"
                onClick={() => setPulsado('confirmado')}
                disabled={enviando}
                aria-describedby={idNota}
                className={`${BOTON_BASE} w-full bg-action font-medium text-ink hover:bg-action-hover sm:w-auto sm:self-start`}
              >
                {cargando('confirmado') ? 'Confirmando…' : 'Confirmar pedido'}
              </button>
              <p id={idNota} className="text-xs leading-relaxed text-ink-soft">
                {nota}
              </p>
            </div>
          ) : (
            <p id={idNota} className="text-xs leading-relaxed text-ink-soft">
              {nota}
            </p>
          )}

          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            {pedido.estado === 'confirmado' && (
              <button
                type="submit"
                name="estado"
                value="entregado"
                onClick={() => setPulsado('entregado')}
                disabled={enviando}
                className={`${BOTON_BASE} w-full border border-ink text-ink hover:bg-ink hover:text-paper sm:w-auto`}
              >
                {cargando('entregado') ? 'Guardando…' : 'Marcar entregado'}
              </button>
            )}

            {whatsapp ? (
              <a
                href={whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                title={mensajeWhatsapp}
                className={`${BOTON_BASE} w-full gap-2 border border-hairline bg-paper text-ink hover:border-ink sm:w-auto`}
              >
                Escribir al cliente
                {/* Flecha dibujada, no el carácter ↗: en varios sistemas ese
                    carácter se renderiza como emoji a todo color. */}
                <svg
                  aria-hidden
                  viewBox="0 0 12 12"
                  className="size-3"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3.5 8.5 8.5 3.5M4.5 3.5h4v4" />
                </svg>
                <span className="sr-only">(abre WhatsApp en otra pestaña)</span>
              </a>
            ) : (
              <span className="text-xs text-ink-muted">
                El celular guardado no sirve para WhatsApp:{' '}
                <span className="font-mono">{pedido.cliente_telefono}</span>
              </span>
            )}

            {/* Cancelar en dos pasos, con <details>: sin JavaScript, sin
                window.confirm (que en el teléfono aparece pegado arriba y no
                dice nada del stock) y explicando la consecuencia real. En
                pantalla ancha se despliega hacia abajo con el resumen anclado
                a la derecha (flex-col items-end): sin eso, abrirlo ensancha el
                bloque y el propio enlace se corre justo al tocarlo. */}
            {pedido.estado !== 'cancelado' && (
              <details className="sm:ml-auto sm:flex sm:flex-col sm:items-end">
                <summary className="inline-flex min-h-11 cursor-pointer list-none items-center text-sm text-ink-muted transition-colors duration-(--dur-fast) hover:text-danger [&::-webkit-details-marker]:hidden">
                  Cancelar pedido
                </summary>
                <div className="mt-2 w-full rounded-xl border border-hairline bg-paper p-3 sm:w-80">
                  <p className="text-xs leading-relaxed text-ink-soft">
                    {porDevolver > 0
                      ? `Cancelar devuelve ${unidades(porDevolver)} al stock.`
                      : 'Cancelar no mueve el stock: este pedido nunca lo descontó.'}{' '}
                    No se puede deshacer.
                  </p>
                  <button
                    type="submit"
                    name="estado"
                    value="cancelado"
                    onClick={() => setPulsado('cancelado')}
                    disabled={enviando}
                    className={`${BOTON_BASE} mt-2 w-full border border-danger text-danger hover:bg-danger hover:text-paper sm:w-auto`}
                  >
                    {cargando('cancelado') ? 'Cancelando…' : 'Sí, cancelar el pedido'}
                  </button>
                </div>
              </details>
            )}
          </div>
        </form>

        {respuesta?.ok === true && (
          <p className="mt-3 flex items-start gap-2 text-sm text-ok" role="status">
            <span aria-hidden className="mt-1.5 size-1.5 shrink-0 rounded-full bg-ok" />
            {respuesta.mensaje}
          </p>
        )}

        {respuesta?.ok === false && (
          <div
            role="alert"
            className="mt-3 rounded-xl border border-danger/30 bg-danger/5 px-3 py-3 text-sm text-danger"
          >
            <p className="leading-relaxed">{respuesta.error}</p>
            {respuesta.motivo === 'stock' && (
              <Link
                href="/admin/stock"
                className="mt-2 inline-flex min-h-11 items-center rounded-full border border-danger/40 px-4 text-sm text-danger transition-colors duration-(--dur-fast) hover:bg-danger hover:text-paper"
              >
                Ir a ajustar el stock
              </Link>
            )}
          </div>
        )}
      </div>
    </li>
  )
}
