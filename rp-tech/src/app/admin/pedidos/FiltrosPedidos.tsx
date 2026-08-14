'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { useFiltrosUrl, useHidratado } from '@/lib/useFiltrosUrl'
import { ESTADOS, ETIQUETA_FILTRO, type OrderEstado } from './vista'

/**
 * Barra de filtros. Enlaces y un formulario GET: el filtro queda en la URL y se
 * puede guardar o compartir ("mándame el link de los pendientes"). Cada control
 * arrastra el valor del otro —filtrar por estado no borra lo que se escribió en
 * el buscador, y buscar no borra el estado—.
 *
 * Sin JavaScript sigue funcionando entero: los estados son enlaces de verdad y
 * el buscador es un `<form method="get">` con su botón. Con JavaScript, escribir
 * filtra solo tras 300 ms de silencio, tocar un estado filtra al instante, y el
 * botón "Buscar" se OCULTA — se oculta, no se borra del marcado.
 *
 * El buscador es NO controlado: si su `value` dependiera del `?q=` que estamos
 * actualizando, cada tecla lo re-renderizaría con el valor viejo mientras la
 * navegación va en curso y el cursor saltaría a mitad de palabra. Esta pantalla
 * se usa de pie, con una mano, y perder una letra ahí se paga caro.
 *
 * El estado activo se marca con subrayado, no con una píldora de fondo gris:
 * es el mismo lenguaje que el filtro de categorías de la tienda, y deja el
 * color disponible para lo que sí lo necesita (el punto de cada estado y el
 * botón de confirmar).
 */

/** Un punto de color por estado. El color nunca va solo: siempre con texto. */
const PUNTO: Record<OrderEstado, string> = {
  pendiente: 'bg-action',
  confirmado: 'bg-signal',
  entregado: 'bg-ok',
  cancelado: 'bg-ink-muted',
}

export default function FiltrosPedidos({
  estadoActivo,
  busqueda,
  cuenta,
  total,
  visibles,
}: {
  estadoActivo: OrderEstado | undefined
  busqueda: string
  cuenta: Record<OrderEstado, number>
  total: number
  /** Cuántos pedidos quedan a la vista: se anuncia a lectores de pantalla. */
  visibles: number
}) {
  const { aplicar, aplicarConRetardo, pendiente } = useFiltrosUrl()
  const hidratado = useHidratado()
  const buscador = useRef<HTMLInputElement>(null)

  /* URL → campo, y sólo si el campo no tiene el foco: hace falta para el botón
     "atrás" y para "Limpiar", donde la URL cambia sin que nadie teclee. La
     guarda del foco impide que esto toque el valor mientras se escribe. */
  useEffect(() => {
    const campo = buscador.current
    if (campo && campo.value !== busqueda && document.activeElement !== campo) {
      campo.value = busqueda
    }
  }, [busqueda])

  /* `aplicar` cancela el retardo del buscador, así que cambiar de estado tiene
     que llevarse consigo lo que hay escrito o se pierde la última letra. */
  const textoBuscado = () => buscador.current?.value ?? ''

  const consulta = (estado?: OrderEstado) => {
    const query: Record<string, string> = {}
    if (busqueda) query.q = busqueda
    if (estado) query.estado = estado
    return query
  }

  const clase = (activo: boolean) =>
    [
      'inline-flex min-h-11 items-center gap-2 text-sm transition-colors duration-(--dur-fast)',
      activo
        ? 'text-ink underline decoration-signal decoration-2 underline-offset-[10px]'
        : 'text-ink-muted hover:text-ink',
    ].join(' ')

  /* El href es lo que funciona sin JS. Con JS pasamos por el hook: conserva lo
     tecleado, cancela el retardo en vuelo y no deja una entrada de historial
     por cada estado que se toca. */
  function irA(e: React.MouseEvent, estado: OrderEstado | undefined) {
    e.preventDefault()
    aplicar({ estado: estado ?? null, q: textoBuscado() })
  }

  return (
    <div className="border-y border-hairline py-1 lg:flex lg:items-center lg:justify-between lg:gap-8">
      <nav aria-label="Filtrar pedidos por estado">
        <ul className="flex flex-wrap items-center gap-x-5">
          <li>
            <Link
              href={{ pathname: '/admin/pedidos', query: consulta() }}
              aria-current={!estadoActivo ? 'page' : undefined}
              onClick={(e) => irA(e, undefined)}
              className={clase(!estadoActivo)}
            >
              Todos
              <span className="font-mono text-spec text-ink-muted">{total}</span>
            </Link>
          </li>
          {ESTADOS.map((estado) => (
            <li key={estado}>
              <Link
                href={{ pathname: '/admin/pedidos', query: consulta(estado) }}
                aria-current={estadoActivo === estado ? 'page' : undefined}
                onClick={(e) => irA(e, estado)}
                className={clase(estadoActivo === estado)}
              >
                <span aria-hidden className={`size-2 rounded-full ${PUNTO[estado]}`} />
                {ETIQUETA_FILTRO[estado]}
                <span className="font-mono text-spec text-ink-muted">{cuenta[estado]}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="flex items-center gap-4 border-t border-hairline lg:border-t-0">
        <form
          method="get"
          action="/admin/pedidos"
          role="search"
          onSubmit={(e) => {
            e.preventDefault()
            aplicar({ q: textoBuscado() })
          }}
          className="flex min-w-0 flex-1 items-center gap-3 lg:w-72 lg:flex-none"
        >
          {estadoActivo ? <input type="hidden" name="estado" value={estadoActivo} /> : null}
          <input
            ref={buscador}
            type="search"
            name="q"
            defaultValue={busqueda}
            placeholder="Código, cliente, celular…"
            aria-label="Buscar pedidos por código, cliente, celular o distrito"
            autoComplete="off"
            enterKeyHint="search"
            onChange={(e) => aplicarConRetardo({ q: e.target.value })}
            className="min-h-11 min-w-0 flex-1 bg-transparent text-sm text-ink placeholder:text-ink-muted"
          />
          {/* Señal discreta de que la lista se está rehaciendo. Ocupa su sitio
              siempre (opacidad, no montaje) para que la barra no dé un salto en
              cada tecla — en el teléfono ese salto mueve el campo bajo el dedo. */}
          <span
            aria-hidden="true"
            className={`shrink-0 font-mono text-spec text-ink-muted transition-opacity duration-(--dur-fast) ${
              pendiente ? 'opacity-100' : 'opacity-0'
            }`}
          >
            buscando…
          </span>
          {/* Sin JavaScript este botón es la única forma de buscar. Con
              JavaScript sobra, así que se tapa — pero sigue en el marcado. */}
          <button
            type="submit"
            className={`min-h-11 shrink-0 text-sm text-ink-soft transition-colors duration-(--dur-fast) hover:text-ink ${
              hidratado ? 'hidden' : ''
            }`}
          >
            Buscar
          </button>
        </form>

        {busqueda ? (
          <Link
            href={{ pathname: '/admin/pedidos', query: estadoActivo ? { estado: estadoActivo } : {} }}
            onClick={(e) => {
              e.preventDefault()
              if (buscador.current) buscador.current.value = ''
              aplicar({ q: null })
            }}
            className="inline-flex min-h-11 shrink-0 items-center text-sm text-ink-muted transition-colors duration-(--dur-fast) hover:text-ink"
          >
            Limpiar
          </Link>
        ) : null}
      </div>

      {/* La lista cambia sin recargar: quien no la ve necesita que se lo digan. */}
      <p role="status" aria-live="polite" className="sr-only">
        {visibles} {visibles === 1 ? 'pedido' : 'pedidos'} a la vista
        {estadoActivo || busqueda ? ' con el filtro aplicado' : ''}.
      </p>
    </div>
  )
}
