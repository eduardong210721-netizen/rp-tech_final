'use client'

import { useState } from 'react'
import {
  nivelStock,
  disponibleReal,
  requiereConfirmacion,
  formatearDelta,
  type ItemStock,
} from './logica'
import { NIVEL } from './estilos'

/** Atajos de ajuste. Cubren el 95% del trabajo real: contar y reponer poco. */
const ATAJOS = [-5, -1, 1, 5] as const

export type Props = {
  item: ItemStock
  /** Stock que se muestra: el optimista tras aplicar, o el de la base. */
  stockVisible: number
  /** Solo una fila del panel puede estar en edición a la vez. */
  activa: boolean
  /** Ajuste pendiente. Lo guarda la LISTA, no esta fila: ver ListaStock. */
  delta: number
  /** Texto crudo del campo: deja escribir "−" sin que el parseo lo borre. */
  texto: string
  aplicando: boolean
  mensaje: { delta: number; nuevo: number } | null
  error: string | null
  onAtajo: (paso: number) => void
  onEscribir: (valor: string) => void
  onAplicar: (delta: number) => void
  onCerrar: () => void
}

export default function FilaStock({
  item,
  stockVisible,
  activa,
  delta,
  texto,
  aplicando,
  mensaje,
  error,
  onAtajo,
  onEscribir,
  onAplicar,
  onCerrar,
}: Props) {
  const [confirmando, setConfirmando] = useState(false)

  /* Cuando el dueño empieza a ajustar otra fila, esta se apaga. La pregunta de
     confirmación es lo único que sigue siendo suyo, y se cancela al apagarse:
     volver a abrir la fila no puede encontrarse un "¿seguro?" heredado de un
     número que ya no está. Patrón oficial de React para ajustar estado al
     cambiar una prop, sin useEffect. */
  const [activaVista, setActivaVista] = useState(activa)
  if (activa !== activaVista) {
    setActivaVista(activa)
    if (!activa) setConfirmando(false)
  }

  /* El nivel se calcula sobre el stock VISIBLE, no sobre la prop del servidor:
     si no, al aplicar un ajuste el número cambia al instante y el color se
     queda con el valor viejo hasta que llega el refresco. Un "4" junto a un
     chip que dice "Bajo mínimo" es exactamente el tipo de señal contradictoria
     que hace dudar de la pantalla. */
  const nivel = nivelStock({
    stock: stockVisible,
    stockMinimo: item.stockMinimo,
    bajoPedido: item.bajoPedido,
  })
  const estilo = NIVEL[nivel]
  const disponible = disponibleReal({ stock: stockVisible, comprometido: item.comprometido })
  const destino = stockVisible + delta
  const grande = requiereConfirmacion(stockVisible, delta)

  /* Tocar el número cancela la confirmación pendiente: si el dueño corrige el
     ajuste, la pregunta se hace otra vez sobre el número nuevo. */
  function atajo(paso: number) {
    setConfirmando(false)
    onAtajo(paso)
  }

  function escribir(valor: string) {
    setConfirmando(false)
    onEscribir(valor)
  }

  function aplicar() {
    if (delta === 0 || aplicando) return
    if (grande && !confirmando) {
      setConfirmando(true)
      return
    }
    onAplicar(delta)
  }

  const idPanel = `ajuste-${item.id}`
  const enElSuelo = delta === -stockVisible && stockVisible > 0

  return (
    <li
      className={`relative overflow-hidden rounded-card border border-hairline bg-paper transition-shadow duration-(--dur-fast) ease-(--ease-out-soft) ${
        activa ? 'ring-2 ring-signal' : ''
      }`}
    >
      {/* Filete de nivel. Es un elemento propio y no un `border-l-*` para que
          el anillo de foco de la fila activa no compita con su color. */}
      <span aria-hidden="true" className={`absolute inset-y-0 left-0 w-1 ${estilo.rail}`} />

      <div className="grid gap-4 py-4 pl-5 pr-4 lg:grid-cols-[11rem_minmax(0,1fr)_auto] lg:items-center lg:gap-6">
        {/* ── Estado y SKU ─────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-chip px-2 py-1 text-xs font-medium ${estilo.chip}`}
          >
            <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${estilo.punto}`} />
            {estilo.etiqueta}
          </span>
          <span className="font-mono text-spec text-ink-muted">{item.sku}</span>
        </div>

        {/* ── Producto ─────────────────────────────────────────────────── */}
        <div className="min-w-0">
          <p className="text-ink">
            {item.nombre}
            {!item.activo && (
              <span className="ml-2 rounded-chip bg-paper-alt px-2 py-0.5 text-xs text-ink-muted">
                Inactivo
              </span>
            )}
          </p>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-spec text-ink-muted">
            {item.categoriaNombre && <span>{item.categoriaNombre}</span>}
            <span>mín {item.stockMinimo}</span>
            {item.comprometido > 0 && (
              <span className={disponible <= 0 ? 'text-danger' : 'text-ink-soft'}>
                {item.comprometido} comprometidas · disponible real {disponible}
              </span>
            )}
          </p>
        </div>

        {/* ── Cantidad y ajuste ────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-3 lg:flex-nowrap lg:justify-end lg:gap-4">
          <div
            className={`flex min-w-16 flex-col items-center rounded-xl border px-3 py-1.5 ${estilo.caja}`}
          >
            <span className="sr-only">Stock actual de {item.nombre}:</span>
            <span className={`font-mono text-title tabular-nums ${estilo.numero}`}>
              {stockVisible}
            </span>
            <span className="eyebrow">unidades</span>
          </div>

          <div
            /* En el teléfono el grupo se lleva la línea entera y reparte los
               cuatro botones a lo ancho de la tarjeta: pulgar grande, objetivo
               grande. En pantalla ancha vuelve a la derecha del número. */
            className="flex grow items-center justify-between gap-1 sm:grow-0 sm:justify-end sm:gap-1.5"
            role="group"
            aria-label={`Ajustar ${item.nombre}`}
          >
            {ATAJOS.map((paso, i) => (
              <button
                key={paso}
                type="button"
                onClick={() => atajo(paso)}
                disabled={aplicando || (paso < 0 && stockVisible + delta <= 0)}
                aria-label={`${paso > 0 ? 'Sumar' : 'Restar'} ${Math.abs(paso)} ${
                  Math.abs(paso) === 1 ? 'unidad' : 'unidades'
                } a ${item.nombre}`}
                aria-controls={idPanel}
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border font-mono text-sm transition-colors duration-(--dur-fast) ease-(--ease-out-soft) disabled:cursor-not-allowed disabled:opacity-30 ${
                  Math.abs(paso) === 1
                    ? 'border-ink-muted text-ink hover:border-ink hover:bg-ink hover:text-paper'
                    : 'border-hairline text-ink-soft hover:border-ink-muted hover:text-ink'
                } ${i === 1 ? 'mr-1.5 sm:mr-2.5' : ''}`}
              >
                {formatearDelta(paso)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Panel de ajuste pendiente ─────────────────────────────────────
          Solo aparece cuando hay algo que aplicar. Muestra el destino ANTES
          de escribir en la base: ver "11 → 14" evita la mitad de los errores.
          Nada se escribe hasta que se pulsa Aplicar. */}
      <div id={idPanel}>
        {activa && (
          <div className="border-t border-hairline bg-paper-alt py-4 pl-5 pr-4">
            <div className="flex flex-wrap items-end gap-x-6 gap-y-4">
              <div>
                <label
                  htmlFor={`delta-${item.id}`}
                  className="eyebrow block"
                >
                  Ajuste · suma o resta
                </label>
                <input
                  id={`delta-${item.id}`}
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  value={texto}
                  onChange={(e) => escribir(e.target.value)}
                  disabled={aplicando}
                  aria-describedby={`destino-${item.id}`}
                  className="mt-1.5 w-24 rounded-lg border border-hairline bg-paper px-3 py-2 text-center font-mono text-heading tabular-nums text-ink transition-colors duration-(--dur-fast) hover:border-ink-muted focus:border-ink"
                />
              </div>

              <p id={`destino-${item.id}`} className="font-mono text-heading tabular-nums text-ink-soft">
                <span className="text-ink-muted">{stockVisible}</span>
                <span aria-hidden="true"> → </span>
                <span className="sr-only"> queda en </span>
                <span className={`font-medium ${destino === 0 ? 'text-danger' : 'text-ink'}`}>
                  {destino}
                </span>
              </p>

              <div className="flex flex-wrap items-center gap-3">
                {confirmando ? (
                  <>
                    <button
                      type="button"
                      onClick={aplicar}
                      disabled={aplicando}
                      className="rounded-full bg-danger px-5 py-2.5 text-sm font-medium text-paper transition-opacity duration-(--dur-fast) hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Sí, aplicar {formatearDelta(delta)}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmando(false)}
                      className="text-sm text-ink-soft underline decoration-hairline underline-offset-4 transition-colors duration-(--dur-fast) hover:text-ink hover:decoration-ink"
                    >
                      Revisar
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={aplicar}
                      disabled={delta === 0 || aplicando}
                      className="rounded-full border border-ink bg-ink px-5 py-2.5 text-sm font-medium text-paper transition-opacity duration-(--dur-fast) hover:opacity-85 disabled:cursor-not-allowed disabled:border-hairline disabled:bg-paper disabled:text-ink-muted disabled:opacity-60"
                    >
                      {aplicando ? 'Aplicando…' : `Aplicar ${formatearDelta(delta)}`}
                    </button>
                    <button
                      type="button"
                      onClick={onCerrar}
                      disabled={aplicando}
                      className="text-sm text-ink-soft underline decoration-hairline underline-offset-4 transition-colors duration-(--dur-fast) hover:text-ink hover:decoration-ink disabled:opacity-50"
                    >
                      Descartar
                    </button>
                  </>
                )}
              </div>
            </div>

            {confirmando && (
              <p className="mt-4 max-w-prose rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-ink">
                Es un ajuste grande para este producto: {stockVisible} → {destino} (
                {formatearDelta(delta)}). Revisa el número antes de confirmar.
              </p>
            )}

            {enElSuelo && !confirmando && (
              <p className="mt-3 font-mono text-spec text-ink-muted">
                El stock no puede quedar por debajo de 0.
              </p>
            )}
          </div>
        )}
      </div>

      {/* ── Resultado ─────────────────────────────────────────────────────
          El error NO se parece al éxito: filete rojo, palabra "no se cambió". */}
      {error && (
        <p
          role="alert"
          className="border-t border-danger/30 bg-danger/5 py-3 pl-5 pr-4 text-sm text-danger"
        >
          {error}
        </p>
      )}
      {!error && mensaje && !activa && (
        <p className="border-t border-hairline py-2.5 pl-5 pr-4 text-sm text-ok">
          Aplicado {formatearDelta(mensaje.delta)} · quedó en{' '}
          <span className="font-mono tabular-nums">{mensaje.nuevo}</span>
        </p>
      )}
    </li>
  )
}
