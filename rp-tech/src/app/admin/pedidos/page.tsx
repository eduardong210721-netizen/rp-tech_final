import Link from 'next/link'
import { requireAdmin } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { formatPEN } from '@/lib/format'
import FiltrosPedidos from './FiltrosPedidos'
import PedidoCard from './PedidoCard'
import {
  contarPorEstado,
  esEstadoValido,
  fechaLima,
  filtrarPedidos,
  mensajeParaCliente,
  textoEntrega,
  whatsappCliente,
  type OrderEstado,
  type OrderItemRow,
  type OrderRow,
} from './vista'

/**
 * Pedidos.
 *
 * La pantalla cuenta UNA historia: un pedido registrado todavía no es una
 * venta. Nace `pendiente` y no toca el inventario; el stock se descuenta
 * recién al confirmarlo. Por eso "Confirmar" es el único botón de color de
 * cada tarjeta y dice, debajo, cuántas unidades va a descontar.
 *
 * Tarjetas, no tabla. Un pedido tiene código, cliente, celular, distrito,
 * referencia, fecha, monto, estado y N líneas: eso es una tabla de nueve
 * columnas que en un teléfono se convierte en scroll horizontal ilegible. Y
 * el dueño atiende pedidos desde el celular mientras coordina por WhatsApp,
 * así que el teléfono es el caso principal, no la degradación.
 */

/** Nunca se traen más pedidos que esto de una vez. */
const LIMITE = 300

type OrderDbRow = Omit<OrderRow, 'subtotal'> & { subtotal: number | string }

type OrderItemDbRow = {
  id: string
  order_id: string
  product_id: string | null
  sku: string
  nombre: string
  precio_unitario: number | string
  cantidad: number
  stock_descontado: boolean
}

export default async function PedidosPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string; q?: string }>
}) {
  await requireAdmin()
  const db = supabaseAdmin()

  const { estado: estadoParam, q: qParam } = await searchParams
  const estado: OrderEstado | undefined = esEstadoValido(estadoParam) ? estadoParam : undefined
  const q = (qParam ?? '').slice(0, 80).trim()

  const { data: pedidosData, error: pedidosErr } = await db
    .from('orders')
    .select(
      'id, codigo, cliente_nombre, cliente_telefono, distrito, referencia, subtotal, estado, created_at',
    )
    // Orden fijo por fecha, y solo por fecha: cambiar el estado de un pedido
    // no puede moverlo de sitio. Ver el comentario de filtrarPedidos().
    .order('created_at', { ascending: false })
    .limit(LIMITE)

  if (pedidosErr) throw new Error(`PedidosPage: ${pedidosErr.message}`)

  const todos: OrderRow[] = ((pedidosData ?? []) as OrderDbRow[]).map((p) => ({
    ...p,
    subtotal: Number(p.subtotal),
  }))

  const cuenta = contarPorEstado(todos)
  const visibles = filtrarPedidos(todos, { estado, q })

  // Las líneas se piden solo para los pedidos que se van a pintar.
  const items = new Map<string, OrderItemRow[]>()
  if (visibles.length > 0) {
    const { data: itemsData, error: itemsErr } = await db
      .from('order_items')
      .select('id, order_id, product_id, sku, nombre, precio_unitario, cantidad, stock_descontado')
      .in(
        'order_id',
        visibles.map((p) => p.id),
      )

    if (itemsErr) throw new Error(`PedidosPage/items: ${itemsErr.message}`)

    const filas = (itemsData ?? []) as OrderItemDbRow[]

    // `bajo_pedido` no vive en la línea sino en el producto, y decide si
    // confirmar mueve inventario. Sin este dato la tarjeta prometería
    // descontar unidades que confirmar_pedido() salta.
    const productIds = [...new Set(filas.map((f) => f.product_id).filter((id) => id !== null))]
    const bajoPedido = new Set<string>()
    if (productIds.length > 0) {
      const { data: productos, error: productosErr } = await db
        .from('products')
        .select('id, bajo_pedido')
        .in('id', productIds)

      if (productosErr) throw new Error(`PedidosPage/productos: ${productosErr.message}`)
      for (const p of (productos ?? []) as { id: string; bajo_pedido: boolean }[]) {
        if (p.bajo_pedido) bajoPedido.add(p.id)
      }
    }

    for (const fila of filas) {
      const lista = items.get(fila.order_id) ?? []
      lista.push({
        id: fila.id,
        sku: fila.sku,
        nombre: fila.nombre,
        precio_unitario: Number(fila.precio_unitario),
        cantidad: fila.cantidad,
        stock_descontado: fila.stock_descontado,
        existe_producto: fila.product_id !== null,
        bajo_pedido: fila.product_id !== null && bajoPedido.has(fila.product_id),
      })
      items.set(fila.order_id, lista)
    }
    // Orden estable dentro de la tarjeta: PostgREST no garantiza ninguno.
    for (const [id, lista] of items) {
      items.set(
        id,
        [...lista].sort((a, b) => a.sku.localeCompare(b.sku)),
      )
    }
  }

  const hayPedidos = todos.length > 0
  const filtrado = Boolean(estado) || Boolean(q)

  return (
    <div>
      <div className="mb-6">
        <p className="eyebrow">Ventas</p>
        <h1 className="mt-2 text-title">Pedidos</h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink-soft">
          Un pedido registrado todavía no es una venta y no toca el inventario.{' '}
          <span className="text-ink">El stock se descuenta cuando confirmas</span>, y vuelve si
          cancelas.
        </p>
      </div>

      {cuenta.pendiente > 0 && (
        <p className="mb-5 flex items-center gap-2.5 rounded-xl border border-action/40 bg-action/10 px-4 py-3 text-sm text-ink">
          <span aria-hidden className="size-2 shrink-0 rounded-full bg-action" />
          {cuenta.pendiente === 1
            ? 'Hay 1 pedido pendiente por confirmar.'
            : `Hay ${cuenta.pendiente} pedidos pendientes por confirmar.`}
        </p>
      )}

      {hayPedidos && (
        <FiltrosPedidos
          estadoActivo={estado}
          busqueda={q}
          cuenta={cuenta}
          total={todos.length}
          visibles={visibles.length}
        />
      )}

      {!hayPedidos ? (
        <VacioSinPedidos />
      ) : visibles.length === 0 ? (
        <VacioSinCoincidencias />
      ) : (
        <>
          <ul className="mt-5 space-y-4">
            {visibles.map((pedido) => {
              const lineas = items.get(pedido.id) ?? []
              const monto = formatPEN(pedido.subtotal)
              return (
                <PedidoCard
                  key={pedido.id}
                  pedido={pedido}
                  items={lineas}
                  fecha={fechaLima(pedido.created_at)}
                  monto={monto}
                  whatsapp={whatsappCliente(pedido, monto)}
                  mensajeWhatsapp={mensajeParaCliente(pedido, monto)}
                  textoEntrega={textoEntrega(pedido)}
                />
              )
            })}
          </ul>

          {todos.length === LIMITE && !filtrado && (
            <p className="mt-6 text-center text-xs text-ink-muted">
              Se muestran los {LIMITE} pedidos más recientes.
            </p>
          )}
        </>
      )}
    </div>
  )
}

/**
 * Sin pedidos todavía. No es un error ni un hueco: es el estado normal de una
 * tienda que acaba de abrir, y es el mejor momento para explicar de dónde
 * salen los pedidos y qué pasa con el stock.
 */
function VacioSinPedidos() {
  return (
    <div className="mt-5 rounded-2xl border border-hairline bg-paper px-6 py-14 text-center">
      <p className="eyebrow">Sin pedidos</p>
      <p className="mx-auto mt-4 max-w-md text-heading text-ink">
        Todavía no hay ningún pedido registrado.
      </p>
      <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-ink-soft">
        Cuando alguien complete el checkout de la tienda, su pedido aparece aquí como{' '}
        <span className="text-ink">Pendiente</span>, con el stock intacto. Al confirmarlo desde esta
        pantalla se descuenta el inventario y el pedido queda listo para entregar.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex min-h-11 items-center rounded-full border border-hairline px-5 text-sm text-ink transition-colors duration-(--dur-fast) hover:border-ink"
      >
        Ver la tienda
      </Link>
    </div>
  )
}

function VacioSinCoincidencias() {
  return (
    <div className="mt-5 rounded-2xl border border-dashed border-hairline px-6 py-14 text-center">
      <p className="text-sm text-ink">Ningún pedido coincide con este filtro.</p>
      <Link
        href="/admin/pedidos"
        className="mt-4 inline-flex min-h-11 items-center rounded-full border border-hairline bg-paper px-5 text-sm text-ink transition-colors duration-(--dur-fast) hover:border-ink"
      >
        Ver todos los pedidos
      </Link>
    </div>
  )
}
