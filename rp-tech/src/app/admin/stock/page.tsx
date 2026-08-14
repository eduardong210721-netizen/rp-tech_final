import Link from 'next/link'
import { requireAdmin } from '@/lib/auth'
import { listAdminProducts, listCategories } from '@/lib/repo/products'
import { supabaseAdmin } from '@/lib/supabase/admin'
import FiltrosStock from './FiltrosStock'
import ListaStock from './ListaStock'
import {
  filtrarStock,
  resumirNiveles,
  esFiltroEstado,
  disponibleReal,
  type FiltroEstado,
  type ItemStock,
} from './logica'

/**
 * Pantalla de stock.
 *
 * EL ORDEN ES FIJO: SKU ascendente, siempre. La versión anterior ponía primero
 * los productos con stock bajo, así que en cuanto se ajustaba una cantidad la
 * fila saltaba de sitio y el dueño perdía el hilo — con once productos molesta,
 * con cincuenta hace imposible trabajar, y fue la causa directa de que se
 * escribieran cantidades equivocadas.
 *
 * La urgencia se comunica con color, con un filete a la izquierda de la fila y
 * con las pastillas de filtro (`?estado=agotado`), nunca moviendo filas a
 * espaldas de quien está escribiendo.
 */

type Comprometido = { product_id: string; comprometido: number }

async function leerComprometidos(): Promise<Map<string, number>> {
  const { data, error } = await supabaseAdmin()
    .from('stock_comprometido')
    .select('product_id, comprometido')

  if (error) throw new Error(`StockPage/comprometido: ${error.message}`)

  const mapa = new Map<string, number>()
  for (const fila of (data ?? []) as Comprometido[]) {
    mapa.set(fila.product_id, Number(fila.comprometido))
  }
  return mapa
}

export default async function StockPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; estado?: string; cat?: string }>
}) {
  await requireAdmin()

  const { q, estado, cat } = await searchParams
  const estadoActual: FiltroEstado = esFiltroEstado(estado) ? estado : 'todos'
  const busqueda = q?.trim() ? q.trim() : undefined

  const [productos, categorias, comprometidos] = await Promise.all([
    listAdminProducts(),
    listCategories(),
    leerComprometidos(),
  ])

  const categoriaPorId = new Map(categorias.map((c) => [c.id, c]))
  const categoriaValida = cat && categorias.some((c) => c.slug === cat) ? cat : undefined

  /* Se construye campo por campo, igual que `toPublicProduct`: `listAdminProducts`
     trae costo, utilidad y margen, y esta lista se serializa hacia un Client
     Component. Un `...p` mandaría el costo al navegador. */
  const items: ItemStock[] = productos.map((p) => {
    const categoria = p.categoria_id ? categoriaPorId.get(p.categoria_id) : undefined
    return {
      id: p.id,
      sku: p.sku,
      nombre: p.nombre,
      categoriaSlug: categoria?.slug ?? null,
      categoriaNombre: categoria?.nombre ?? null,
      stock: p.stock,
      stockMinimo: p.stock_minimo,
      bajoPedido: p.bajo_pedido,
      activo: p.activo,
      comprometido: comprometidos.get(p.id) ?? 0,
    }
  })

  /* El orden se fija aquí y no se delega a la consulta: es el requisito más
     importante de la pantalla y tiene que ser evidente al leer el archivo.
     La clave es el SKU, un dato que el ajuste de stock no puede cambiar. */
  items.sort((a, b) => a.sku.localeCompare(b.sku, 'es'))

  const resumen = resumirNiveles(items)
  const visibles = filtrarStock(items, {
    q: busqueda,
    estado: estadoActual,
    categoria: categoriaValida,
  })

  const enRiesgo = items.filter((i) => i.comprometido > 0 && disponibleReal(i) <= 0)
  const hayComprometidos = resumen.comprometido > 0

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div>
          <p className="eyebrow">Inventario</p>
          <h1 className="mt-2 text-title">Stock</h1>
        </div>
        <p className="font-mono text-spec text-ink-muted">
          {resumen.agotado} agotados · {resumen.bajo} bajo mínimo · {resumen.todos} productos
        </p>
      </div>

      <p className="mb-6 max-w-prose text-sm text-ink-soft">
        La lista está ordenada por SKU y no se mueve al ajustar: la fila que
        tocas se queda donde estaba. Cada ajuste es relativo —sumas o restas
        unidades— y ves el resultado antes de aplicarlo.
      </p>

      {enRiesgo.length > 0 && (
        <p className="mb-6 rounded-card border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-ink">
          <span className="font-medium text-danger">Ojo:</span>{' '}
          {enRiesgo.length === 1
            ? `${enRiesgo[0]?.nombre} ya está entero comprometido en pedidos sin confirmar.`
            : `${enRiesgo.length} productos están enteros comprometidos en pedidos sin confirmar.`}{' '}
          Confirma o cancela esos pedidos en{' '}
          <Link
            href="/admin/pedidos"
            className="underline decoration-hairline underline-offset-4 transition-colors duration-(--dur-fast) hover:decoration-ink"
          >
            Pedidos
          </Link>{' '}
          antes de volver a venderlos.
        </p>
      )}

      <FiltrosStock
        categorias={categorias}
        resumen={resumen}
        q={busqueda}
        estado={estadoActual}
        cat={categoriaValida}
        visibles={visibles.length}
        hayComprometidos={hayComprometidos}
      />

      {/* El "no coincide nada" lo pinta ListaStock, no esta página: si fuera un
          hermano, filtrar hasta cero resultados desmontaría la lista y se
          llevaría por delante el ajuste que el dueño tuviera a medio escribir. */}
      {items.length === 0 ? (
        <p className="rounded-card border border-dashed border-hairline py-16 text-center text-sm text-ink-muted">
          Aún no hay productos.
        </p>
      ) : (
        <ListaStock items={visibles} />
      )}
    </div>
  )
}
