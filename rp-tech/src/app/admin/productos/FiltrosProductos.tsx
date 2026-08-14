'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import type { Category } from '@/lib/repo/products'
import { useFiltrosUrl, useHidratado } from '@/lib/useFiltrosUrl'
import type { EstadoFiltro } from './filtrar'

/**
 * Barra de búsqueda y filtros del listado.
 *
 * Es un `<form method="get">` de verdad, no un puñado de handlers: sin
 * JavaScript se llena, se pulsa "Aplicar" y funciona. El estado del filtro vive
 * en la URL (compartible, recargable, y el botón "atrás" del navegador hace lo
 * que uno espera) y `router.refresh()` tras desactivar un producto vuelve a la
 * MISMA vista filtrada en lugar de tirar al dueño al listado completo.
 *
 * Con JavaScript, los tres controles aplican solos —al escribir con un respiro
 * de 300 ms, al elegir al instante— y el botón "Aplicar" se OCULTA. Se oculta,
 * no se borra: sigue en el marcado para quien no tenga JavaScript.
 *
 * Los campos son NO controlados. Su `value` no puede depender del `searchParam`
 * que estamos actualizando: cada tecla los re-renderizaría con el valor viejo
 * mientras la navegación está en curso y el cursor saltaría a mitad de palabra.
 * Se escribe hacia la URL; sólo se copia de vuelta al campo cuando el usuario
 * no lo está tocando (efecto de sincronía).
 *
 * Cada control inmediato arrastra el texto del buscador, así que aplicar uno
 * nunca borra los otros dos.
 */
export default function FiltrosProductos({
  categorias,
  q,
  cat,
  estado,
  totalFiltrado,
  total,
}: {
  categorias: Category[]
  q: string
  cat: string
  estado: EstadoFiltro
  totalFiltrado: number
  total: number
}) {
  const { aplicar, aplicarConRetardo, pendiente } = useFiltrosUrl()
  const hidratado = useHidratado()
  const buscador = useRef<HTMLInputElement>(null)
  const selectorCat = useRef<HTMLSelectElement>(null)
  const selectorEstado = useRef<HTMLSelectElement>(null)

  /* URL → campo, y sólo si el campo no tiene el foco. Hace falta para el botón
     "atrás", para "Limpiar" y para cualquier enlace que cambie la URL sin pasar
     por el teclado: un campo no controlado conservaría lo escrito aunque el
     parámetro ya no exista. La guarda del foco es lo que impide que esto toque
     el valor mientras se escribe. */
  useEffect(() => {
    const campo = buscador.current
    if (campo && campo.value !== q && document.activeElement !== campo) campo.value = q
  }, [q])

  useEffect(() => {
    const campo = selectorCat.current
    if (campo && campo.value !== cat) campo.value = cat
  }, [cat])

  useEffect(() => {
    const campo = selectorEstado.current
    if (campo && campo.value !== estado) campo.value = estado
  }, [estado])

  /* `aplicar` cancela el retardo pendiente del buscador, así que todo cambio
     inmediato tiene que llevarse consigo lo que hay escrito. Sin esto, elegir
     una categoría justo después de teclear perdería la última letra. */
  const textoBuscado = () => buscador.current?.value ?? ''

  const hayFiltro = q !== '' || cat !== '' || estado !== 'todos'

  const campo =
    'w-full rounded-lg border border-hairline bg-paper px-3 py-2.5 text-sm text-ink transition-colors duration-(--dur-fast) hover:border-ink-muted focus:border-ink'

  function limpiar() {
    if (buscador.current) buscador.current.value = ''
    if (selectorCat.current) selectorCat.current.value = ''
    if (selectorEstado.current) selectorEstado.current.value = 'todos'
    aplicar({ q: null, cat: null, estado: null })
  }

  return (
    <section
      aria-labelledby="titulo-filtros"
      className="rounded-2xl border border-hairline bg-paper p-4 sm:p-5"
    >
      <h2 id="titulo-filtros" className="sr-only">
        Buscar y filtrar productos
      </h2>

      <form
        method="get"
        action="/admin/productos"
        onSubmit={(e) => {
          // Con JS, Enter aplica al instante en vez de recargar entera la
          // página. Sin JS este manejador no existe y el envío es el nativo.
          e.preventDefault()
          aplicar({ q: textoBuscado() })
        }}
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-end"
      >
        <div>
          <div className="flex items-baseline justify-between gap-3">
            <label htmlFor="q" className="mb-1.5 block text-xs text-ink-muted">
              Buscar
            </label>
            {/* Señal de que algo está pasando. Con opacidad, no montando y
                desmontando el texto: así el alto de la fila no salta en cada
                tecla. Es para la vista; al lector de pantalla le habla la
                región viva del pie, que dice el resultado. */}
            <span
              aria-hidden="true"
              className={`mb-1.5 font-mono text-[0.6875rem] text-ink-muted transition-opacity duration-(--dur-fast) ${
                pendiente ? 'opacity-100' : 'opacity-0'
              }`}
            >
              buscando…
            </span>
          </div>
          <input
            ref={buscador}
            id="q"
            type="search"
            name="q"
            defaultValue={q}
            maxLength={60}
            enterKeyHint="search"
            autoComplete="off"
            placeholder="Nombre, SKU o marca"
            onChange={(e) => aplicarConRetardo({ q: e.target.value })}
            className={campo}
          />
        </div>

        <div>
          <label htmlFor="cat" className="mb-1.5 block text-xs text-ink-muted">
            Categoría
          </label>
          <select
            ref={selectorCat}
            id="cat"
            name="cat"
            defaultValue={cat}
            onChange={(e) => aplicar({ cat: e.target.value, q: textoBuscado() })}
            className={campo}
          >
            <option value="">Todas</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.slug}>
                {c.nombre}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="estado" className="mb-1.5 block text-xs text-ink-muted">
            Estado
          </label>
          <select
            ref={selectorEstado}
            id="estado"
            name="estado"
            defaultValue={estado}
            onChange={(e) =>
              aplicar({
                // "todos" es la ausencia de filtro: fuera de la URL.
                estado: e.target.value === 'todos' ? null : e.target.value,
                q: textoBuscado(),
              })
            }
            className={campo}
          >
            <option value="todos">Todos</option>
            <option value="activos">Activos</option>
            <option value="inactivos">Inactivos</option>
          </select>
        </div>

        <div className="flex items-center gap-4 sm:col-span-2 lg:col-span-1">
          {/* Sin JavaScript, este botón es la única forma de aplicar. Con
              JavaScript sobra, así que se tapa — pero sigue en el marcado. */}
          <button
            type="submit"
            className={`rounded-full border border-ink px-5 py-2.5 text-sm text-ink transition-colors duration-(--dur-fast) hover:bg-ink hover:text-paper ${
              hidratado ? 'hidden' : ''
            }`}
          >
            Aplicar
          </button>
          {hayFiltro && (
            <Link
              href="/admin/productos"
              onClick={(e) => {
                e.preventDefault()
                limpiar()
              }}
              className="text-sm text-ink-soft underline underline-offset-4 transition-colors duration-(--dur-fast) hover:text-ink"
            >
              Limpiar
            </Link>
          )}
        </div>
      </form>

      {/* Región viva: la lista cambia sin recargar, y quien no la ve necesita
          que se lo digan. */}
      <p
        role="status"
        aria-live="polite"
        className="mt-4 border-t border-hairline pt-3 text-sm text-ink-soft"
      >
        {hayFiltro ? (
          <>
            <span className="font-mono text-ink">{totalFiltrado}</span> de{' '}
            <span className="font-mono">{total}</span> productos coinciden.
          </>
        ) : (
          <>
            <span className="font-mono text-ink">{total}</span> productos en el catálogo.
          </>
        )}{' '}
        Orden alfabético fijo: cambiar precio, stock o estado no mueve una fila de sitio.
      </p>
    </section>
  )
}
