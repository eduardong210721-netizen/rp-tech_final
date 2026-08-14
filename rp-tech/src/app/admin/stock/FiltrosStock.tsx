'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import type { Category } from '@/lib/repo/products'
import { useFiltrosUrl, useHidratado } from '@/lib/useFiltrosUrl'
import { NIVEL } from './estilos'
import type { FiltroEstado, Resumen } from './logica'

/**
 * Barra de búsqueda y filtros.
 *
 * Todo el estado vive en la URL (`?q=&estado=&cat=`): así el filtro se puede
 * compartir por WhatsApp ("mira, /admin/stock?estado=agotado"), sobrevive a un
 * F5 y —lo importante— el servidor ya sabe filtrar sin ayuda del navegador.
 *
 * SIGUE SIENDO UN FORMULARIO GET DE VERDAD. Sin JavaScript se escribe, se
 * pulsa "Aplicar" y funciona igual que siempre. Con JavaScript el hook
 * sincroniza la URL al escribir o al elegir, y el botón se OCULTA (no se borra
 * del marcado: `useHidratado()` sólo lo tapa después de hidratar, así quien no
 * tenga JS lo sigue viendo y usando).
 *
 * El buscador es NO controlado a propósito. Si su `value` dependiera del
 * `searchParam` que estamos actualizando, cada tecla lo re-renderizaría con el
 * valor viejo mientras la navegación está en curso y el cursor saltaría a
 * mitad de palabra. Escribimos hacia la URL, nunca de vuelta hacia el campo —
 * salvo cuando el usuario no lo está tocando (ver el efecto de sincronía).
 *
 * Las pastillas de estado hacen doble trabajo: filtran y son la leyenda de
 * color de la tabla. El punto de color va siempre acompañado del nombre del
 * estado y de su conteo — el color nunca informa solo.
 */

type Props = {
  categorias: Category[]
  resumen: Resumen
  q: string | undefined
  estado: FiltroEstado
  cat: string | undefined
  /** Cuántos productos quedan visibles: se anuncia a lectores de pantalla. */
  visibles: number
  /** La pastilla de comprometidos solo existe si hay algo comprometido. */
  hayComprometidos: boolean
}

const RUTA = '/admin/stock'

function construirQuery(
  base: { q?: string | undefined; estado: FiltroEstado; cat?: string | undefined },
  cambio: { estado: FiltroEstado },
): Record<string, string> {
  const query: Record<string, string> = {}
  if (base.q) query.q = base.q
  if (base.cat) query.cat = base.cat
  if (cambio.estado !== 'todos') query.estado = cambio.estado
  return query
}

export default function FiltrosStock({
  categorias,
  resumen,
  q,
  estado,
  cat,
  visibles,
  hayComprometidos,
}: Props) {
  const { aplicar, aplicarConRetardo, pendiente } = useFiltrosUrl()
  const hidratado = useHidratado()
  const buscador = useRef<HTMLInputElement>(null)
  const selectorCat = useRef<HTMLSelectElement>(null)

  const qUrl = q ?? ''
  const catUrl = cat ?? ''

  /* Sincronía URL → campo, sólo cuando el campo NO tiene el foco.
     Hace falta para el botón "atrás", para "Quitar filtros" y para cualquier
     enlace que cambie la URL sin pasar por el teclado: un campo no controlado
     conserva lo que el usuario escribió aunque el parámetro ya no exista, y se
     quedaría mintiendo. La guarda del foco es lo que impide que esto toque el
     valor mientras se escribe. */
  useEffect(() => {
    const campo = buscador.current
    if (campo && campo.value !== qUrl && document.activeElement !== campo) {
      campo.value = qUrl
    }
  }, [qUrl])

  useEffect(() => {
    const campo = selectorCat.current
    if (campo && campo.value !== catUrl) campo.value = catUrl
  }, [catUrl])

  /* Un cambio inmediato (selector o pastilla) arrastra lo que hay escrito en
     el buscador: `aplicar` cancela el retardo pendiente, así que sin esto la
     letra recién tecleada se perdería al elegir una categoría. */
  const textoBuscado = () => buscador.current?.value ?? ''

  const pastillas: { valor: FiltroEstado; etiqueta: string; punto: string | null; cuenta: number }[] = [
    { valor: 'todos', etiqueta: 'Todos', punto: null, cuenta: resumen.todos },
    { valor: 'agotado', etiqueta: NIVEL.agotado.etiqueta, punto: NIVEL.agotado.punto, cuenta: resumen.agotado },
    { valor: 'bajo', etiqueta: NIVEL.bajo.etiqueta, punto: NIVEL.bajo.punto, cuenta: resumen.bajo },
    { valor: 'normal', etiqueta: NIVEL.normal.etiqueta, punto: NIVEL.normal.punto, cuenta: resumen.normal },
  ]
  if (hayComprometidos) {
    pastillas.push({
      valor: 'comprometido',
      etiqueta: 'Con pedidos sin confirmar',
      punto: NIVEL['bajo-pedido'].punto,
      cuenta: resumen.comprometido,
    })
  }

  const hayFiltro = Boolean(q || cat) || estado !== 'todos'

  function limpiar() {
    if (buscador.current) buscador.current.value = ''
    if (selectorCat.current) selectorCat.current.value = ''
    aplicar({ q: null, cat: null, estado: null })
  }

  return (
    <section aria-label="Búsqueda y filtros" className="mb-6 rounded-card border border-hairline bg-paper p-4">
      <form
        method="get"
        action={RUTA}
        onSubmit={(e) => {
          // Con JS, Enter aplica al instante en vez de recargar la página
          // entera. Sin JS este manejador no existe y el envío es el nativo.
          e.preventDefault()
          aplicar({ q: textoBuscado() })
        }}
        className="flex flex-col gap-4 sm:flex-row sm:items-end"
      >
        {/* El estado activo viaja escondido: buscar no puede borrar el filtro
            que ya estaba puesto. */}
        {estado !== 'todos' && <input type="hidden" name="estado" value={estado} />}

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-3">
            <label htmlFor="buscar-stock" className="eyebrow block">
              Buscar
            </label>
            {/* Señal de que algo está pasando. Con opacidad y no montando y
                desmontando el texto: así no salta el alto de la fila en cada
                tecla. Lo lee la vista; al lector de pantalla le hablamos con
                la región viva de abajo, que dice el resultado. */}
            <span
              aria-hidden="true"
              className={`font-mono text-spec text-ink-muted transition-opacity duration-(--dur-fast) ${
                pendiente ? 'opacity-100' : 'opacity-0'
              }`}
            >
              buscando…
            </span>
          </div>
          <input
            ref={buscador}
            id="buscar-stock"
            type="search"
            name="q"
            defaultValue={qUrl}
            placeholder="Nombre o SKU"
            autoComplete="off"
            enterKeyHint="search"
            onChange={(e) => aplicarConRetardo({ q: e.target.value })}
            className="mt-1.5 h-11 w-full rounded-lg border border-hairline bg-paper px-3 text-sm text-ink transition-colors duration-(--dur-fast) placeholder:text-ink-muted hover:border-ink-muted focus:border-ink"
          />
        </div>

        <div className="sm:w-56">
          <label htmlFor="categoria-stock" className="eyebrow block">
            Categoría
          </label>
          <select
            ref={selectorCat}
            id="categoria-stock"
            name="cat"
            defaultValue={catUrl}
            onChange={(e) => aplicar({ cat: e.target.value, q: textoBuscado() })}
            className="mt-1.5 h-11 w-full rounded-lg border border-hairline bg-paper px-3 text-sm text-ink transition-colors duration-(--dur-fast) hover:border-ink-muted focus:border-ink"
          >
            <option value="">Todas</option>
            {categorias.map((categoria) => (
              <option key={categoria.id} value={categoria.slug}>
                {categoria.nombre}
              </option>
            ))}
          </select>
        </div>

        {/* Sin JavaScript este botón es la única forma de aplicar. Con
            JavaScript sobra, así que se tapa — pero se queda en el marcado. */}
        <button
          type="submit"
          className={`h-11 shrink-0 rounded-full border border-ink px-5 text-sm text-ink transition-colors duration-(--dur-fast) hover:bg-ink hover:text-paper ${
            hidratado ? 'hidden' : ''
          }`}
        >
          Aplicar
        </button>
      </form>

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-hairline pt-4">
        <p className="eyebrow mr-1 w-full sm:w-auto">Estado</p>
        {pastillas.map((pastilla) => {
          const activa = pastilla.valor === estado
          return (
            <Link
              key={pastilla.valor}
              href={{ pathname: RUTA, query: construirQuery({ q, estado, cat }, { estado: pastilla.valor }) }}
              aria-current={activa ? 'page' : undefined}
              onClick={(e) => {
                // El href de arriba es el que funciona sin JS. Con JS pasamos
                // por el hook para no perder lo que se acaba de teclear y para
                // no dejar una entrada de historial por cada pastilla.
                e.preventDefault()
                aplicar({
                  estado: pastilla.valor === 'todos' ? null : pastilla.valor,
                  q: textoBuscado(),
                })
              }}
              className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-3.5 text-sm transition-colors duration-(--dur-fast) ease-(--ease-out-soft) ${
                activa
                  ? 'border-signal bg-signal/10 text-ink'
                  : 'border-hairline text-ink-soft hover:border-ink-muted hover:text-ink'
              }`}
            >
              {pastilla.punto && (
                <span aria-hidden="true" className={`h-2 w-2 rounded-full ${pastilla.punto}`} />
              )}
              {pastilla.etiqueta}
              <span className="font-mono text-spec text-ink-muted">{pastilla.cuenta}</span>
            </Link>
          )
        })}

        {hayFiltro && (
          <Link
            href={RUTA}
            onClick={(e) => {
              e.preventDefault()
              limpiar()
            }}
            className="ml-auto inline-flex min-h-11 items-center text-sm text-ink-soft underline decoration-hairline underline-offset-4 transition-colors duration-(--dur-fast) hover:text-ink hover:decoration-ink"
          >
            Quitar filtros
          </Link>
        )}
      </div>

      {/* La lista cambia sin recargar: quien no la ve necesita que se lo
          digan. */}
      <p role="status" aria-live="polite" className="sr-only">
        {visibles} {visibles === 1 ? 'producto' : 'productos'} en la lista
        {hayFiltro ? ' con los filtros aplicados' : ''}.
      </p>
    </section>
  )
}
