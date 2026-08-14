'use client'

import { useRef, useState, useTransition, type FormEvent, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Category } from '@/lib/repo/products'
import type { AdminProduct } from '@/lib/domain/product'
import { formatPEN } from '@/lib/format'
import { crearProducto, actualizarProducto } from './actions'
import { subirImagen } from './imagenes-actions'
import SelectorFoto from './SelectorFoto'
import { bloqueantesPendientes, requisitosPublicacion } from './publicacion'

/**
 * La ficha de un producto, en bloques.
 *
 * Antes era una sola columna de dieciséis campos donde el SKU, el precio, el
 * stock y la garantía pesaban lo mismo. Ahora cada bloque responde una
 * pregunta —qué es, cuánto cuesta, dónde va y cómo se vende, qué dice la
 * ficha— y a la derecha queda fijo lo único que hay que vigilar mientras se
 * escribe: el margen y lo que le falta al producto para poder publicarse.
 *
 * Dos campos son de solo lectura al editar, y no por comodidad:
 *
 * - **SKU**: `order_items` guarda el producto vendido por su id, y el SKU es
 *   la referencia legible de ese histórico. Renombrarlo deja los pedidos ya
 *   hechos apuntando a un código que ya no existe.
 * - **Stock**: es una columna que se mueve sola. Un pedido puede descontar
 *   unidades entre que se abre este formulario y se guarda; grabar el número
 *   leído al abrir resucita stock ya vendido. Se ajusta en /admin/stock, con
 *   sumas y restas (RPC `ajustar_stock`), nunca con un absoluto.
 *
 * Los dos, además, ni siquiera viajan en el payload de edición: el esquema del
 * servidor los descarta (ver ./esquemas.ts). La interfaz explica; el servidor
 * garantiza.
 */

type Especificacion = { clave: string; etiqueta: string; valor: string }

type Props = {
  modo: 'crear' | 'editar'
  categorias: Category[]
  producto?: AdminProduct
}

/* `text-base` en móvil no es capricho: con menos de 16px, Safari de iOS hace
   zoom al enfocar un campo y descoloca el formulario entero. */
const CAMPO =
  'w-full rounded-lg border border-hairline bg-paper px-3 py-2.5 text-base text-ink transition-colors duration-(--dur-fast) placeholder:text-ink-muted hover:border-ink-muted focus:border-ink sm:text-sm'
const CAMPO_FIJO =
  'w-full cursor-not-allowed rounded-lg border border-hairline bg-paper-alt px-3 py-2.5 text-base text-ink-soft sm:text-sm'
const ETIQUETA = 'mb-1.5 block text-sm text-ink-soft'
const AYUDA = 'mt-1.5 text-xs text-ink-muted'
const ENLACE =
  'text-ink underline underline-offset-2 transition-colors duration-(--dur-fast) hover:text-signal-ink'

function Bloque({
  id,
  titulo,
  descripcion,
  children,
  columnas = 'sm:grid-cols-2',
}: {
  id: string
  titulo: string
  descripcion?: ReactNode
  children: ReactNode
  columnas?: string
}) {
  return (
    <section
      aria-labelledby={id}
      className="rounded-2xl border border-hairline bg-paper p-5 sm:p-6"
    >
      <h2 id={id} className="text-heading">
        {titulo}
      </h2>
      {descripcion && <p className="mt-2 text-sm text-ink-soft">{descripcion}</p>}
      <div className={`mt-5 grid gap-5 ${columnas}`}>{children}</div>
    </section>
  )
}

export default function ProductForm({ modo, categorias, producto }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  /**
   * Id del producto ya creado cuando la foto falló después. El producto existe:
   * volver a enviar el formulario chocaría con el SKU único, así que en ese
   * estado se ofrece continuar en la ficha de edición en vez de reintentar.
   */
  const [creadoId, setCreadoId] = useState<string | null>(null)

  const [sku, setSku] = useState(producto?.sku ?? '')
  const [nombre, setNombre] = useState(producto?.nombre ?? '')
  const [descripcionCorta, setDescripcionCorta] = useState(producto?.descripcion_corta ?? '')
  const [descripcionLarga, setDescripcionLarga] = useState(producto?.descripcion_larga ?? '')
  const [marca, setMarca] = useState(producto?.marca ?? '')
  const [modelo, setModelo] = useState(producto?.modelo ?? '')

  // Clave estable por fila: con el índice como `key`, reordenar movía el foco
  // y el texto de un campo a otro. Es determinista, así que el render del
  // servidor y el del navegador coinciden.
  const contador = useRef(producto?.especificaciones.length ?? 0)
  const [especificaciones, setEspecificaciones] = useState<Especificacion[]>(() =>
    (producto?.especificaciones ?? []).map((e, i) => ({ clave: `e${i}`, ...e })),
  )

  const [categoriaId, setCategoriaId] = useState(producto?.categoria_id ?? categorias[0]?.id ?? '')
  const [precio, setPrecio] = useState(String(producto?.precio ?? ''))
  const [costo, setCosto] = useState(String(producto?.costo ?? ''))
  const [stock, setStock] = useState(String(producto?.stock ?? 0))
  const [stockMinimo, setStockMinimo] = useState(String(producto?.stock_minimo ?? 3))
  const [bajoPedido, setBajoPedido] = useState(producto?.bajo_pedido ?? false)
  const [activo, setActivo] = useState(producto?.activo ?? true)
  const [garantiaMeses, setGarantiaMeses] = useState(
    producto?.garantia_meses != null ? String(producto.garantia_meses) : '',
  )

  // Solo al crear: al editar, las fotos se manejan en la galería de arriba,
  // que sí puede subir contra un producto que ya existe.
  const [foto, setFoto] = useState<File | null>(null)
  const [altFoto, setAltFoto] = useState('')

  const precioNum = Number(precio) || 0
  const costoNum = Number(costo) || 0
  const stockNum = modo === 'crear' ? Number(stock) || 0 : (producto?.stock ?? 0)
  const utilidad = precioNum - costoNum
  const margen = precioNum > 0 ? (utilidad / precioNum) * 100 : 0
  const costoSupera = costoNum > precioNum

  const fotos = modo === 'crear' ? (foto ? 1 : 0) : producto!.imagenes.length
  const especificacionesLlenas = especificaciones.filter(
    (e) => e.etiqueta.trim() && e.valor.trim(),
  )
  const requisitos = requisitosPublicacion({
    precio: precioNum,
    costo: costoNum,
    categoriaId,
    fotos,
    especificaciones: especificacionesLlenas.length,
    descripcionCorta,
    stock: stockNum,
    bajoPedido,
  })
  const bloqueantes = bloqueantesPendientes(requisitos)
  const noPuedePublicarse = bloqueantes.length > 0

  function agregarEspecificacion() {
    const clave = `n${contador.current++}`
    setEspecificaciones((prev) => [...prev, { clave, etiqueta: '', valor: '' }])
  }

  function actualizarEspecificacion(i: number, campo: 'etiqueta' | 'valor', valor: string) {
    setEspecificaciones((prev) => prev.map((e, idx) => (idx === i ? { ...e, [campo]: valor } : e)))
  }

  function quitarEspecificacion(i: number) {
    setEspecificaciones((prev) => prev.filter((_, idx) => idx !== i))
  }

  /** Mueve una fila una posición. El orden es dato: las dos primeras salen en la tarjeta. */
  function moverEspecificacion(i: number, direccion: -1 | 1) {
    setEspecificaciones((prev) => {
      const destino = i + direccion
      if (destino < 0 || destino >= prev.length) return prev
      const copia = [...prev]
      const actual = copia[i]
      const otro = copia[destino]
      if (!actual || !otro) return prev
      copia[i] = otro
      copia[destino] = actual
      return copia
    })
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    if (foto && !altFoto.trim()) {
      setError('Describe qué se ve en la foto: el texto alternativo es obligatorio.')
      return
    }

    // Publicar con precio 0 o sin categoría no es un descuido de estilo: el
    // primero deja pedir el producto gratis desde el carrito y el segundo lo
    // esconde de los filtros. Se puede guardar igual, pero inactivo.
    if (activo && noPuedePublicarse) {
      setError(
        `No se puede publicar todavía: falta ${bloqueantes
          .map((r) => r.etiqueta.toLowerCase())
          .join(' y ')}. Corrígelo o desmarca "Publicado en la tienda" para guardarlo como borrador.`,
      )
      return
    }

    const comun = {
      nombre: nombre.trim(),
      descripcion_corta: descripcionCorta.trim() || null,
      descripcion_larga: descripcionLarga.trim() || null,
      marca: marca.trim() || null,
      modelo: modelo.trim() || null,
      especificaciones: especificacionesLlenas.map((e) => ({
        etiqueta: e.etiqueta.trim(),
        valor: e.valor.trim(),
      })),
      categoria_id: categoriaId,
      precio: precioNum,
      costo: costoNum,
      stock_minimo: Number(stockMinimo) || 0,
      bajo_pedido: bajoPedido,
      activo,
      garantia_meses: garantiaMeses.trim() ? Number(garantiaMeses) : null,
    }

    startTransition(async () => {
      if (modo === 'editar') {
        // Ni `sku` ni `stock` viajan: no son campos de este formulario.
        const resultado = await actualizarProducto(producto!.id, comun)
        if (!resultado.ok) {
          setError(resultado.error)
          return
        }
        router.push('/admin/productos')
        router.refresh()
        return
      }

      const resultado = await crearProducto({
        ...comun,
        sku: sku.trim(),
        stock: Number(stock) || 0,
      })
      if (!resultado.ok) {
        setError(resultado.error)
        return
      }

      // La foto se sube después: hasta ahora no existía un product_id contra
      // el que enlazarla.
      if (foto) {
        const datos = new FormData()
        datos.set('archivo', foto)
        datos.set('alt', altFoto)
        const subida = await subirImagen(resultado.id, datos)
        if (!subida.ok) {
          setCreadoId(resultado.id)
          setError(`El producto se creó, pero la foto no subió: ${subida.error}`)
          return
        }
      }

      router.push(`/admin/productos/${resultado.id}`)
      router.refresh()
    })
  }

  const textoBoton = pending ? 'Guardando…' : modo === 'crear' ? 'Crear producto' : 'Guardar cambios'

  const guardar = (
    <button
      type="submit"
      disabled={pending || creadoId !== null}
      className="w-full rounded-full bg-action px-6 py-3 text-sm font-medium text-ink transition-colors duration-(--dur-fast) hover:bg-action-hover disabled:cursor-not-allowed disabled:opacity-50"
    >
      {textoBoton}
    </button>
  )

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="lg:grid lg:grid-cols-[minmax(0,1fr)_19rem] lg:items-start lg:gap-8"
    >
      <div className="space-y-5">
        {/* ---------------- Identidad ---------------- */}
        <Bloque id="b-identidad" titulo="Identidad">
          <div>
            <label htmlFor="sku" className={ETIQUETA}>
              SKU
            </label>
            {modo === 'editar' ? (
              <>
                <input
                  id="sku"
                  value={producto!.sku}
                  readOnly
                  aria-describedby="ayuda-sku"
                  className={`${CAMPO_FIJO} font-mono`}
                />
                <p id="ayuda-sku" className={AYUDA}>
                  El SKU no se cambia: es la referencia con la que quedan guardados los pedidos ya
                  hechos. Si necesitas otro código, crea un producto nuevo.
                </p>
              </>
            ) : (
              <>
                <input
                  id="sku"
                  required
                  maxLength={32}
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  aria-describedby="ayuda-sku"
                  className={`${CAMPO} font-mono`}
                />
                <p id="ayuda-sku" className={AYUDA}>
                  No se podrá cambiar después: queda pegado al histórico de pedidos.
                </p>
              </>
            )}
          </div>

          <div>
            <label htmlFor="nombre" className={ETIQUETA}>
              Nombre
            </label>
            <input
              id="nombre"
              required
              minLength={3}
              maxLength={200}
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className={CAMPO}
            />
          </div>

          <div>
            <label htmlFor="marca" className={ETIQUETA}>
              Marca
            </label>
            <input
              id="marca"
              maxLength={60}
              value={marca}
              onChange={(e) => setMarca(e.target.value)}
              className={CAMPO}
            />
          </div>

          <div>
            <label htmlFor="modelo" className={ETIQUETA}>
              Modelo
            </label>
            <input
              id="modelo"
              maxLength={60}
              value={modelo}
              onChange={(e) => setModelo(e.target.value)}
              className={CAMPO}
            />
          </div>
        </Bloque>

        {/* ---------------- Precio ---------------- */}
        <Bloque
          id="b-precio"
          titulo="Precio"
          descripcion="El costo y la utilidad son solo del panel: nunca salen en la tienda ni en el enlace que recibe el cliente."
        >
          <div>
            <label htmlFor="precio" className={ETIQUETA}>
              Precio de venta
            </label>
            <div className="relative">
              <span
                aria-hidden
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-sm text-ink-muted"
              >
                S/
              </span>
              <input
                id="precio"
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                required
                value={precio}
                placeholder="0.00"
                onChange={(e) => setPrecio(e.target.value)}
                className={`${CAMPO} pl-9 font-mono`}
              />
            </div>
          </div>

          <div>
            <label htmlFor="costo" className={ETIQUETA}>
              Costo
            </label>
            <div className="relative">
              <span
                aria-hidden
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-sm text-ink-muted"
              >
                S/
              </span>
              <input
                id="costo"
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                required
                value={costo}
                placeholder="0.00"
                onChange={(e) => setCosto(e.target.value)}
                className={`${CAMPO} pl-9 font-mono`}
              />
            </div>
          </div>

          {costoSupera && (
            <p
              role="alert"
              className="rounded-lg bg-danger/10 px-3 py-2.5 text-sm text-danger sm:col-span-2"
            >
              El costo supera al precio: pierdes {formatPEN(Math.abs(utilidad))} en cada venta.
            </p>
          )}
        </Bloque>

        {/* ---------------- Clasificación y venta ---------------- */}
        <Bloque id="b-clasificacion" titulo="Clasificación y venta">
          <div>
            <label htmlFor="categoria" className={ETIQUETA}>
              Categoría
            </label>
            <select
              id="categoria"
              required
              value={categoriaId}
              onChange={(e) => setCategoriaId(e.target.value)}
              className={CAMPO}
            >
              <option value="" disabled>
                Elige una categoría
              </option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="garantia" className={ETIQUETA}>
              Garantía (meses)
            </label>
            <input
              id="garantia"
              type="number"
              inputMode="numeric"
              min={0}
              max={120}
              step="1"
              placeholder="Sin garantía"
              value={garantiaMeses}
              onChange={(e) => setGarantiaMeses(e.target.value)}
              className={`${CAMPO} font-mono`}
            />
          </div>

          <div>
            <label htmlFor="stock" className={ETIQUETA}>
              Stock {modo === 'editar' && <span className="text-ink-muted">· solo lectura</span>}
            </label>
            {modo === 'editar' ? (
              <>
                <input
                  id="stock"
                  value={producto!.stock}
                  readOnly
                  aria-describedby="ayuda-stock"
                  className={`${CAMPO_FIJO} font-mono`}
                />
                <p id="ayuda-stock" className={AYUDA}>
                  No se edita aquí. Un pedido puede descontar unidades mientras tienes el
                  formulario abierto, y guardar este número las devolvería al inventario sin que
                  nadie las haya traído. Se ajusta sumando y restando en{' '}
                  <Link href="/admin/stock" className={ENLACE}>
                    Stock
                  </Link>
                  .
                </p>
              </>
            ) : (
              <>
                <input
                  id="stock"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step="1"
                  required
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  aria-describedby="ayuda-stock"
                  className={`${CAMPO} font-mono`}
                />
                <p id="ayuda-stock" className={AYUDA}>
                  Unidades con las que empieza. Después solo se ajusta desde Stock.
                </p>
              </>
            )}
          </div>

          <div>
            <label htmlFor="stock_minimo" className={ETIQUETA}>
              Stock mínimo
            </label>
            <input
              id="stock_minimo"
              type="number"
              inputMode="numeric"
              min={0}
              step="1"
              required
              value={stockMinimo}
              onChange={(e) => setStockMinimo(e.target.value)}
              className={`${CAMPO} font-mono`}
            />
            <p className={AYUDA}>Por debajo de esto, el producto sale marcado en rojo.</p>
          </div>

          <label
            htmlFor="bajo_pedido"
            className="flex items-start gap-3 rounded-lg border border-hairline p-3.5"
          >
            <input
              id="bajo_pedido"
              type="checkbox"
              checked={bajoPedido}
              onChange={(e) => setBajoPedido(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-hairline accent-signal"
            />
            <span className="text-sm text-ink-soft">
              Vender bajo pedido
              <span className="mt-0.5 block text-xs text-ink-muted">
                Se puede comprar aunque no haya unidades: lo traes cuando te lo piden.
              </span>
            </span>
          </label>

          <label
            htmlFor="activo"
            className={`flex items-start gap-3 rounded-lg border p-3.5 ${
              activo && noPuedePublicarse ? 'border-danger bg-danger/5' : 'border-hairline'
            }`}
          >
            <input
              id="activo"
              type="checkbox"
              checked={activo}
              onChange={(e) => setActivo(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-hairline accent-signal"
            />
            <span className="text-sm text-ink-soft">
              Publicado en la tienda
              <span className="mt-0.5 block text-xs text-ink-muted">
                Sin marcar, el producto existe en el panel pero nadie lo ve en el catálogo.
              </span>
              {activo && noPuedePublicarse && (
                <span className="mt-1.5 block text-xs text-danger">
                  Todavía no se puede publicar: revisa «Antes de publicar».
                </span>
              )}
            </span>
          </label>
        </Bloque>

        {/* ---------------- Ficha técnica ---------------- */}
        <Bloque
          id="b-ficha"
          titulo="Ficha técnica"
          descripcion="Lo que el cliente lee para decidir si el producto le sirve. Es lo que más vende en esta tienda: la compatibilidad."
          columnas=""
        >
          <div>
            <label htmlFor="descripcion_corta" className={ETIQUETA}>
              Descripción corta
            </label>
            <input
              id="descripcion_corta"
              maxLength={200}
              value={descripcionCorta}
              onChange={(e) => setDescripcionCorta(e.target.value)}
              className={CAMPO}
            />
            <p className={AYUDA}>
              Una línea, debajo del nombre en la ficha.{' '}
              <span className="font-mono">{descripcionCorta.length}/200</span>
            </p>
          </div>

          <div>
            <label htmlFor="descripcion_larga" className={ETIQUETA}>
              Descripción larga
            </label>
            <textarea
              id="descripcion_larga"
              maxLength={4000}
              rows={4}
              value={descripcionLarga}
              onChange={(e) => setDescripcionLarga(e.target.value)}
              className={CAMPO}
            />
          </div>

          <div>
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <h3 className="text-sm text-ink">Especificaciones</h3>
              <button
                type="button"
                onClick={agregarEspecificacion}
                className="rounded-full border border-hairline px-3 py-1.5 text-xs text-ink transition-colors duration-(--dur-fast) hover:border-ink"
              >
                + Añadir
              </button>
            </div>
            <p className={AYUDA}>
              El orden importa: <strong className="font-medium text-ink-soft">las dos primeras</strong>{' '}
              son las que se ven en la tarjeta del catálogo. Usa las flechas para reordenarlas.
            </p>

            {especificaciones.length === 0 ? (
              <p className="mt-3 rounded-lg border border-dashed border-hairline px-3 py-6 text-center text-sm text-ink-muted">
                Sin especificaciones. Añade al menos dos: son el dato que el cliente busca.
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {especificaciones.map((esp, i) => (
                  <li key={esp.clave} className="rounded-xl border border-hairline p-3">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <span className="flex items-center gap-2">
                        <span className="font-mono text-spec text-ink-muted">{i + 1}</span>
                        {i < 2 && (
                          <span className="rounded-full bg-paper-alt px-2 py-0.5 font-mono text-[0.625rem] uppercase tracking-[0.08em] text-ink-soft">
                            sale en la tarjeta
                          </span>
                        )}
                      </span>
                      <span className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => moverEspecificacion(i, -1)}
                          disabled={i === 0}
                          aria-label={`Subir la especificación ${i + 1}`}
                          className="flex h-8 w-8 items-center justify-center rounded-full border border-hairline text-ink-soft transition-colors duration-(--dur-fast) hover:border-ink hover:text-ink disabled:cursor-not-allowed disabled:opacity-30"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          onClick={() => moverEspecificacion(i, 1)}
                          disabled={i === especificaciones.length - 1}
                          aria-label={`Bajar la especificación ${i + 1}`}
                          className="flex h-8 w-8 items-center justify-center rounded-full border border-hairline text-ink-soft transition-colors duration-(--dur-fast) hover:border-ink hover:text-ink disabled:cursor-not-allowed disabled:opacity-30"
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          onClick={() => quitarEspecificacion(i)}
                          aria-label={`Quitar la especificación ${i + 1}`}
                          className="ml-1 px-2 py-1.5 text-xs text-ink-muted transition-colors duration-(--dur-fast) hover:text-danger"
                        >
                          Quitar
                        </button>
                      </span>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-[minmax(0,11rem)_minmax(0,1fr)]">
                      <input
                        placeholder="Etiqueta"
                        aria-label={`Etiqueta de la especificación ${i + 1}`}
                        maxLength={60}
                        value={esp.etiqueta}
                        onChange={(e) => actualizarEspecificacion(i, 'etiqueta', e.target.value)}
                        className={CAMPO}
                      />
                      <input
                        placeholder="Valor"
                        aria-label={`Valor de la especificación ${i + 1}`}
                        maxLength={200}
                        value={esp.valor}
                        onChange={(e) => actualizarEspecificacion(i, 'valor', e.target.value)}
                        className={`${CAMPO} font-mono`}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Bloque>

        {/* ---------------- Foto (solo al crear) ---------------- */}
        {modo === 'crear' && (
          <Bloque
            id="b-foto"
            titulo="Foto"
            descripcion="Opcional. Sin foto, el producto sale con la imagen de relleno en toda la tienda; podrás añadir más desde la ficha de edición."
            columnas=""
          >
            <div>
              <SelectorFoto
                idPrefijo="nuevo"
                archivo={foto}
                alt={altFoto}
                onArchivo={setFoto}
                onAlt={setAltFoto}
                deshabilitado={pending || creadoId !== null}
              />
              <p className={AYUDA}>
                El texto de la foto se publica: lo leen en voz alta los lectores de pantalla y
                aparece en la ficha si la imagen no carga. Descríbela como se la describirías a
                alguien por teléfono.
              </p>
            </div>
          </Bloque>
        )}
      </div>

      {/* ---------------- Columna fija: margen, requisitos y guardar ---------------- */}
      <aside className="mt-5 space-y-4 lg:sticky lg:top-6 lg:mt-0">
        <section
          aria-labelledby="b-margen"
          className="rounded-2xl border border-hairline bg-paper p-5"
        >
          <h2 id="b-margen" className="eyebrow">
            Margen
          </h2>
          <p
            className={`mt-3 font-mono ${
              precioNum <= 0
                ? 'text-heading text-ink-muted'
                : `text-title ${costoSupera ? 'text-danger' : 'text-ink'}`
            }`}
            aria-live="polite"
          >
            {precioNum > 0 ? `${margen.toFixed(1)}%` : 'sin precio'}
          </p>
          <dl className="mt-4 space-y-1.5 border-t border-hairline pt-4 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-ink-soft">Precio</dt>
              <dd className="font-mono text-ink">{formatPEN(precioNum)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-ink-soft">Costo</dt>
              <dd className="font-mono text-ink-soft">{formatPEN(costoNum)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-ink-soft">Utilidad</dt>
              <dd className={`font-mono ${costoSupera ? 'text-danger' : 'text-ink'}`}>
                {formatPEN(utilidad)}
              </dd>
            </div>
          </dl>
        </section>

        <section
          aria-labelledby="b-requisitos"
          className="rounded-2xl border border-hairline bg-paper p-5"
        >
          <h2 id="b-requisitos" className="eyebrow">
            Antes de publicar
          </h2>
          <ul className="mt-3 space-y-2.5">
            {requisitos.map((r) => (
              <li key={r.clave} className="flex gap-2.5 text-sm">
                <span
                  aria-hidden
                  className={`mt-0.5 font-mono ${
                    r.cumplido ? 'text-ok' : r.bloqueante ? 'text-danger' : 'text-ink-muted'
                  }`}
                >
                  {r.cumplido ? '✓' : r.bloqueante ? '✕' : '○'}
                </span>
                <span className="min-w-0">
                  <span className={r.cumplido ? 'text-ink-muted' : 'text-ink'}>{r.etiqueta}</span>
                  <span className="sr-only">{r.cumplido ? ': listo' : ': pendiente'}</span>
                  {!r.cumplido && (
                    <span className="mt-0.5 block text-xs text-ink-muted">{r.detalle}</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-4 border-t border-hairline pt-3 text-xs text-ink-muted">
            Las marcas ✕ impiden publicarlo. Las ○ no, pero el producto sale peor en la tienda.
          </p>
        </section>

        {error && (
          <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2.5 text-sm text-danger">
            {error}
          </p>
        )}

        {creadoId ? (
          <Link
            href={`/admin/productos/${creadoId}`}
            className="block rounded-full bg-action px-6 py-3 text-center text-sm font-medium text-ink transition-colors duration-(--dur-fast) hover:bg-action-hover"
          >
            Continuar y añadir la foto
          </Link>
        ) : (
          <div className="hidden lg:block">{guardar}</div>
        )}

        <button
          type="button"
          onClick={() => router.push('/admin/productos')}
          className="hidden w-full py-2 text-sm text-ink-soft transition-colors duration-(--dur-fast) hover:text-ink lg:block"
        >
          {creadoId ? 'Volver al listado' : 'Cancelar'}
        </button>
      </aside>

      {/* En móvil el botón viaja con la pantalla: el formulario es largo y
          nadie debería tener que buscar dónde se guarda. */}
      {!creadoId && (
        <div className="sticky bottom-0 z-10 -mx-4 mt-4 flex items-center gap-4 border-t border-hairline bg-paper/95 px-4 py-3 backdrop-blur lg:hidden">
          <button
            type="button"
            onClick={() => router.push('/admin/productos')}
            className="shrink-0 px-2 py-3 text-sm text-ink-soft"
          >
            Cancelar
          </button>
          <div className="min-w-0 flex-1">{guardar}</div>
        </div>
      )}
    </form>
  )
}
