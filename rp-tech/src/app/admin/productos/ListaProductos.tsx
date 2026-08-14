import Image from 'next/image'
import Link from 'next/link'
import type { AdminProduct } from '@/lib/domain/product'
import type { Category } from '@/lib/repo/products'
import { formatPEN } from '@/lib/format'
import { imageUrl } from '@/lib/images'
import EliminarButton from './EliminarButton'
import { pendientes, requisitosPublicacion } from './publicacion'

/**
 * El listado del catálogo en dos formas deliberadas.
 *
 * **Por qué dos y no una tabla que hace scroll.** La tabla anterior tenía
 * nueve columnas y un `min-width` de 900px: en un teléfono se leía un tercio
 * de una fila y había que arrastrar en horizontal para saber a qué producto
 * pertenecía el número que se estaba mirando. Ese es exactamente el defecto
 * que el dueño describió como "es muy fácil perderse y colocar datos
 * incorrectos". Una tabla con scroll horizontal separa el dato de su nombre;
 * una tarjeta los mantiene juntos.
 *
 * Debajo de `lg` cada producto es una tarjeta con lo que se usa para
 * identificarlo y decidir -foto, nombre, SKU, precio, estado, stock-, y el
 * costo y el margen van en una línea secundaria, tenue: en el teléfono el
 * dueño mira catálogo, no contabilidad. Desde `lg` vuelve la tabla, que ahí sí
 * cabe entera sin scroll horizontal, con costo, utilidad y margen en una sola
 * columna en vez de tres.
 *
 * El stock se MUESTRA y no se edita en ningún ancho: se ajusta en /admin/stock
 * con sumas y restas (RPC `ajustar_stock`), nunca escribiendo un absoluto.
 */

type Props = {
  productos: AdminProduct[]
  categorias: Category[]
  hayFiltro: boolean
}

/** Lectura del stock, con su color. Un solo sitio para las dos vistas. */
function leerStock(p: AdminProduct): { texto: string; nota: string | null; alerta: boolean } {
  if (p.bajo_pedido) return { texto: 'bajo pedido', nota: null, alerta: false }
  if (p.stock === 0) return { texto: '0', nota: 'agotado', alerta: true }
  if (p.stock_bajo) return { texto: String(p.stock), nota: `mín. ${p.stock_minimo}`, alerta: true }
  return { texto: String(p.stock), nota: null, alerta: false }
}

function Miniatura({ producto, ancho }: { producto: AdminProduct; ancho: 'sm' | 'md' }) {
  const foto = producto.imagenes[0]
  const tamano = ancho === 'sm' ? 'w-11' : 'w-16'
  return (
    <div
      className={`relative ${tamano} aspect-square shrink-0 overflow-hidden rounded-lg border border-hairline bg-paper-alt`}
    >
      {foto ? (
        <Image
          src={imageUrl(foto.storage_path)}
          alt=""
          fill
          sizes={ancho === 'sm' ? '44px' : '64px'}
          className="object-contain p-1"
        />
      ) : (
        <span className="flex h-full w-full items-center justify-center font-mono text-[0.5625rem] uppercase tracking-[0.08em] text-ink-muted">
          sin foto
        </span>
      )}
    </div>
  )
}

function Estado({ activo }: { activo: boolean }) {
  return activo ? (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-ok/10 px-2.5 py-1 text-xs font-medium text-ok">
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-ok" />
      Activo
    </span>
  ) : (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-hairline bg-paper-alt px-2.5 py-1 text-xs text-ink-muted">
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-ink-muted" />
      Inactivo
    </span>
  )
}

/**
 * Qué le falta a un producto inactivo para poder publicarse. El dueño dejó dos
 * así a propósito; esto responde "¿y este por qué no está?" sin abrirlo.
 */
function Faltantes({ producto }: { producto: AdminProduct }) {
  if (producto.activo) return null
  const faltan = pendientes(
    requisitosPublicacion({
      precio: producto.precio,
      costo: producto.costo,
      categoriaId: producto.categoria_id ?? '',
      fotos: producto.imagenes.length,
      especificaciones: producto.especificaciones.length,
      descripcionCorta: producto.descripcion_corta ?? '',
      stock: producto.stock,
      bajoPedido: producto.bajo_pedido,
    }),
  )
  if (faltan.length === 0) return null
  return (
    <p className="text-xs text-ink-muted">
      Le falta: <span className="text-ink-soft">{faltan.map((r) => r.corto).join(', ')}</span>
    </p>
  )
}

function CostoMargen({ producto, clase }: { producto: AdminProduct; clase?: string }) {
  const negativo = producto.utilidad < 0
  return (
    <span className={`font-mono text-xs ${clase ?? 'text-ink-muted'}`}>
      costo {formatPEN(producto.costo)} · util. {formatPEN(producto.utilidad)} ·{' '}
      <span className={negativo ? 'text-danger' : undefined}>{producto.margen.toFixed(0)}%</span>
    </span>
  )
}

function Acciones({ producto }: { producto: AdminProduct }) {
  return (
    <>
      <Link
        href={`/admin/productos/${producto.id}`}
        className="rounded-full border border-hairline px-4 py-2 text-sm text-ink transition-colors duration-(--dur-fast) hover:border-ink lg:px-3 lg:py-1.5 lg:text-xs"
      >
        Editar
        <span className="sr-only"> {producto.nombre}</span>
      </Link>
      {producto.activo && <EliminarButton id={producto.id} nombre={producto.nombre} />}
    </>
  )
}

export default function ListaProductos({ productos, categorias, hayFiltro }: Props) {
  const nombreCategoria = new Map(categorias.map((c) => [c.id, c.nombre]))

  if (productos.length === 0) {
    return (
      <div className="rounded-2xl border border-hairline bg-paper px-4 py-12 text-center">
        <p className="text-ink-soft">
          {hayFiltro ? 'Ningún producto coincide con esos filtros.' : 'Aún no hay productos.'}
        </p>
        {hayFiltro && (
          <Link
            href="/admin/productos"
            className="mt-3 inline-block text-sm text-ink underline underline-offset-4 transition-colors duration-(--dur-fast) hover:text-signal-ink"
          >
            Ver todos los productos
          </Link>
        )}
      </div>
    )
  }

  return (
    <>
      {/* ---------- Móvil y tablet: tarjetas ---------- */}
      <ul className="grid gap-3 sm:grid-cols-2 lg:hidden">
        {productos.map((p) => {
          const stock = leerStock(p)
          return (
            <li
              key={p.id}
              className={`rounded-2xl border border-hairline p-4 ${p.activo ? 'bg-paper' : 'bg-paper-alt'}`}
            >
              <div className="flex gap-3.5">
                <Miniatura producto={p} ancho="md" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-mono text-spec text-ink-muted">{p.sku}</p>
                    <Estado activo={p.activo} />
                  </div>
                  <h3 className="mt-1.5 text-sm leading-snug text-ink">{p.nombre}</h3>
                  <p className="mt-0.5 text-xs text-ink-muted">
                    {[p.marca, nombreCategoria.get(p.categoria_id ?? '')].filter(Boolean).join(' · ')}
                  </p>
                  <p className="mt-2 font-mono text-lg text-ink">{formatPEN(p.precio)}</p>
                  <CostoMargen producto={p} />
                  <div className="mt-1">
                    <Faltantes producto={p} />
                  </div>
                </div>
              </div>

              <div className="mt-3.5 flex items-center justify-between gap-3 border-t border-hairline pt-3">
                <p className="text-xs text-ink-muted">
                  Stock{' '}
                  <span className={`font-mono text-sm ${stock.alerta ? 'text-danger' : 'text-ink'}`}>
                    {stock.texto}
                  </span>
                  {stock.nota && <span className="ml-1 text-danger">({stock.nota})</span>}
                </p>
                <div className="flex items-center gap-4">
                  <Acciones producto={p} />
                </div>
              </div>
            </li>
          )
        })}
      </ul>

      {/* ---------- Escritorio: tabla ---------- */}
      <div className="hidden overflow-hidden rounded-2xl border border-hairline bg-paper lg:block">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">
            Productos del catálogo, en orden alfabético. El stock se muestra pero se ajusta en la
            página de Stock.
          </caption>
          <thead className="border-b border-hairline text-ink-muted">
            <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:font-mono [&>th]:text-spec [&>th]:font-normal [&>th]:uppercase [&>th]:tracking-[0.1em]">
              <th scope="col">SKU</th>
              <th scope="col">Producto</th>
              <th scope="col" className="text-right">
                Precio
              </th>
              <th scope="col">Costo y margen</th>
              <th scope="col">Stock</th>
              <th scope="col">Estado</th>
              <th scope="col" className="text-right">
                <span className="sr-only">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {productos.map((p) => {
              const stock = leerStock(p)
              return (
                <tr
                  key={p.id}
                  className={`border-t border-hairline align-middle transition-colors duration-(--dur-fast) hover:bg-paper-alt ${
                    p.activo ? '' : 'bg-paper-alt/60'
                  }`}
                >
                  <td className="px-4 py-3 font-mono text-spec text-ink-muted">{p.sku}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Miniatura producto={p} ancho="sm" />
                      <div className="min-w-0">
                        <Link
                          href={`/admin/productos/${p.id}`}
                          className="block max-w-[26rem] text-ink transition-colors duration-(--dur-fast) hover:text-signal-ink"
                        >
                          {p.nombre}
                        </Link>
                        <p className="mt-0.5 text-xs text-ink-muted">
                          {[p.marca, nombreCategoria.get(p.categoria_id ?? '')]
                            .filter(Boolean)
                            .join(' · ')}
                        </p>
                        <Faltantes producto={p} />
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right font-mono text-ink">
                    {formatPEN(p.precio)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <CostoMargen producto={p} clase="text-ink-soft" />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <span className={`font-mono ${stock.alerta ? 'text-danger' : 'text-ink-soft'}`}>
                      {stock.texto}
                    </span>
                    {stock.nota && <span className="ml-1.5 text-xs text-danger">{stock.nota}</span>}
                  </td>
                  <td className="px-4 py-3">
                    <Estado activo={p.activo} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-3">
                      <Acciones producto={p} />
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </>
  )
}
