import Link from 'next/link'
import type { Metadata } from 'next'
import { requireAdmin } from '@/lib/auth'
import { listAdminProducts, listCategories } from '@/lib/repo/products'
import FiltrosProductos from './FiltrosProductos'
import ListaProductos from './ListaProductos'
import { esEstadoValido, filtrarProductos, ordenarProductos, type EstadoFiltro } from './filtrar'

export const metadata: Metadata = { title: 'Productos · Panel' }

type SearchParams = Promise<{ [clave: string]: string | string[] | undefined }>

/** Un parámetro repetido (`?q=a&q=b`) llega como arreglo: se ignora, no se concatena. */
function texto(valor: string | string[] | undefined): string {
  return typeof valor === 'string' ? valor.trim() : ''
}

export default async function ProductosPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdmin()

  const sp = await searchParams
  const q = texto(sp.q).slice(0, 60)
  const catSlug = texto(sp.cat)
  const estadoParam = texto(sp.estado)
  const estado: EstadoFiltro = esEstadoValido(estadoParam) ? estadoParam : 'todos'

  const [productos, categorias] = await Promise.all([listAdminProducts(), listCategories()])

  // Una categoría desconocida en la URL se ignora en vez de vaciar la lista:
  // el desplegable mostraría "Todas" y el resultado diría "ninguno coincide",
  // dos cosas que se contradicen en pantalla.
  const categoria = categorias.find((c) => c.slug === catSlug)
  const catAplicada = categoria ? catSlug : ''

  const visibles = ordenarProductos(
    filtrarProductos(productos, { q, categoriaId: categoria?.id, estado }),
  )

  const sinFoto = productos.filter((p) => p.imagenes.length === 0).length
  const hayFiltro = q !== '' || catAplicada !== '' || estado !== 'todos'

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div>
          <p className="eyebrow">Catálogo</p>
          <h1 className="mt-2 text-title">Productos</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/admin/stock"
            className="rounded-full border border-hairline px-5 py-2.5 text-sm text-ink transition-colors duration-(--dur-fast) hover:border-ink"
          >
            Ajustar stock
          </Link>
          <Link
            href="/admin/productos/nuevo"
            className="rounded-full bg-action px-5 py-2.5 text-sm font-medium text-ink transition-colors duration-(--dur-fast) hover:bg-action-hover"
          >
            Nuevo producto
          </Link>
        </div>
      </div>

      <p className="text-sm text-ink-soft">
        Aquí se edita la ficha: nombre, precio, categoría y ficha técnica. El stock se muestra pero
        se ajusta en{' '}
        <Link
          href="/admin/stock"
          className="text-ink underline underline-offset-4 transition-colors duration-(--dur-fast) hover:text-signal-ink"
        >
          Stock
        </Link>
        , sumando y restando unidades — así dos cambios seguidos nunca se pisan.
      </p>

      {sinFoto > 0 && (
        <p className="rounded-xl border border-hairline bg-paper px-4 py-3 text-sm text-ink-soft">
          {sinFoto === 1
            ? 'Hay 1 producto sin foto: sale con la imagen de relleno en toda la tienda.'
            : `Hay ${sinFoto} productos sin foto: salen con la imagen de relleno en toda la tienda.`}
        </p>
      )}

      <FiltrosProductos
        categorias={categorias}
        q={q}
        cat={catAplicada}
        estado={estado}
        totalFiltrado={visibles.length}
        total={productos.length}
      />

      <ListaProductos productos={visibles} categorias={categorias} hayFiltro={hayFiltro} />
    </div>
  )
}
