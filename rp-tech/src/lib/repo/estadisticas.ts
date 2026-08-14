import 'server-only'
import { supabaseAdmin } from '@/lib/supabase/admin'

/**
 * Las cifras del panel.
 *
 * Contiene COSTO y UTILIDAD. Nunca importes este módulo desde una ruta
 * pública: solo lo consume /admin, detrás de requireAdmin(). El paquete
 * `server-only` impide que llegue al navegador, pero no impide que una página
 * pública lo renderice en el servidor — esa parte es disciplina.
 *
 * Criterio de qué se mide: el dueño tiene once productos y todavía cero
 * pedidos. Un muro de tarjetas decorativas no le sirve. Cada cifra de aquí
 * responde a una pregunta que él se hace de verdad y termina en una acción:
 * a quién le contesto, qué repongo, cuánto vendí, qué está mal publicado.
 */

/** Perú no aplica horario de verano: es UTC-5 fijo todo el año. */
const DESFASE_LIMA = '-05:00'

/**
 * Comienzo del día de hoy en Lima, como instante absoluto.
 *
 * Sin esto, "ventas de hoy" usaría el día UTC y entre las 19:00 y la
 * medianoche de Lima las ventas de la tarde aparecerían como si fueran de
 * mañana. El dueño cierra su día en Lima, no en Greenwich.
 */
function inicioDelDiaEnLima(ahora: Date): Date {
  // 'en-CA' formatea como YYYY-MM-DD, que es lo que necesita el constructor.
  const fecha = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(ahora)
  return new Date(`${fecha}T00:00:00${DESFASE_LIMA}`)
}

const DIA_MS = 24 * 60 * 60 * 1000

/** Numeric de Postgres puede llegar como string. Nunca dejes pasar un NaN. */
function aNumero(valor: unknown): number {
  const n = typeof valor === 'number' ? valor : Number(valor)
  return Number.isFinite(n) ? n : 0
}

function assertOk(error: { message: string } | null, contexto: string): void {
  if (error) throw new Error(`estadisticas/${contexto}: ${error.message}`)
}

// ------------------------------------------------------------------
// Tipos
// ------------------------------------------------------------------

export type VentanaVentas = {
  /** Pedidos confirmados o entregados dentro de la ventana */
  pedidos: number
  /** Suma de `orders.subtotal` */
  facturado: number
  /** null cuando no hubo pedidos: nunca una división por cero */
  ticketPromedio: number | null
}

export type TipoAlerta = 'sobrevendido' | 'agotado' | 'stock_bajo'

export type AlertaInventario = {
  sku: string
  nombre: string
  tipo: TipoAlerta
  stock: number
  comprometido: number
  /** Qué hay que hacer, en una línea */
  detalle: string
}

export type MasVendido = {
  sku: string
  nombre: string
  unidades: number
  facturado: number
}

export type Estadisticas = {
  pendientes: {
    cantidad: number
    monto: number
    /** Días que lleva esperando el más antiguo; null si no hay ninguno */
    esperaMaximaDias: number | null
  }
  hoy: VentanaVentas
  mes: VentanaVentas
  /** true si existe al menos una venta confirmada en toda la historia */
  huboVentas: boolean
  alertas: AlertaInventario[]
  inventario: {
    referencias: number
    unidades: number
    costo: number
    venta: number
    utilidad: number
  }
  catalogo: {
    total: number
    activos: number
    sinFotoTotal: number
    sinFotoActivos: number
  }
  masVendidos: MasVendido[]
}

// ------------------------------------------------------------------
// Filas crudas
// ------------------------------------------------------------------

type ProductoFila = {
  sku: string
  nombre: string
  precio: number | string
  costo: number | string
  stock: number
  stock_minimo: number
  bajo_pedido: boolean
  activo: boolean
  product_images: { id: string }[] | null
}

type ComprometidoFila = {
  sku: string
  stock: number
  comprometido: number
  disponible_real: number
}

type PedidoFila = { subtotal: number | string; created_at: string }

type ItemFila = {
  sku: string
  nombre: string
  cantidad: number
  precio_unitario: number | string
}

// ------------------------------------------------------------------
// Consulta
// ------------------------------------------------------------------

const ESTADOS_VENDIDOS = ['confirmado', 'entregado'] as const

/**
 * Cinco consultas en paralelo. Con once productos y un puñado de pedidos no
 * hace falta una vista materializada ni agregación en SQL: traer las filas y
 * sumar en memoria es más simple de leer y de auditar, que es lo que importa
 * en la pantalla donde el dueño toma decisiones de plata.
 *
 * La única que sí se acota es la de ventas: se limita a 30 días para que no
 * crezca sin techo cuando el negocio lleve un año facturando.
 */
export async function obtenerEstadisticas(ahora = new Date()): Promise<Estadisticas> {
  const db = supabaseAdmin()

  const inicioHoy = inicioDelDiaEnLima(ahora)
  // 30 días naturales contando hoy: del día -29 al día de hoy inclusive.
  const inicioMes = new Date(inicioHoy.getTime() - 29 * DIA_MS)

  const [productosRes, comprometidoRes, pendientesRes, ventasRes, itemsRes] =
    await Promise.all([
      db
        .from('products')
        .select(
          'sku, nombre, precio, costo, stock, stock_minimo, bajo_pedido, activo, product_images(id)',
        )
        .order('sku'),
      db.from('stock_comprometido').select('sku, stock, comprometido, disponible_real'),
      db.from('orders').select('subtotal, created_at').eq('estado', 'pendiente'),
      db
        .from('orders')
        .select('subtotal, created_at')
        .in('estado', [...ESTADOS_VENDIDOS])
        .gte('created_at', inicioMes.toISOString()),
      // !inner descarta las líneas cuyo pedido no está vendido: el histórico
      // de lo más vendido no puede contar carritos abandonados.
      db
        .from('order_items')
        .select('sku, nombre, cantidad, precio_unitario, orders!inner(estado)')
        .in('orders.estado', [...ESTADOS_VENDIDOS]),
    ])

  assertOk(productosRes.error, 'productos')
  assertOk(comprometidoRes.error, 'comprometido')
  assertOk(pendientesRes.error, 'pendientes')
  assertOk(ventasRes.error, 'ventas')
  assertOk(itemsRes.error, 'items')

  const productos = (productosRes.data ?? []) as unknown as ProductoFila[]
  const comprometido = (comprometidoRes.data ?? []) as unknown as ComprometidoFila[]
  const pendientes = (pendientesRes.data ?? []) as unknown as PedidoFila[]
  const ventas = (ventasRes.data ?? []) as unknown as PedidoFila[]
  const items = (itemsRes.data ?? []) as unknown as ItemFila[]

  return {
    pendientes: resumirPendientes(pendientes, ahora),
    hoy: resumirVentana(ventas, inicioHoy),
    mes: resumirVentana(ventas, inicioMes),
    huboVentas: items.length > 0,
    alertas: construirAlertas(productos, comprometido),
    inventario: valorarInventario(productos),
    catalogo: resumirCatalogo(productos),
    masVendidos: rankearVendidos(items),
  }
}

// ------------------------------------------------------------------
// Cálculo (funciones puras, fáciles de leer de arriba abajo)
// ------------------------------------------------------------------

function resumirPendientes(
  filas: PedidoFila[],
  ahora: Date,
): Estadisticas['pendientes'] {
  let monto = 0
  let masAntiguo: number | null = null

  for (const p of filas) {
    monto += aNumero(p.subtotal)
    const dias = Math.floor((ahora.getTime() - new Date(p.created_at).getTime()) / DIA_MS)
    if (masAntiguo === null || dias > masAntiguo) masAntiguo = dias
  }

  return { cantidad: filas.length, monto, esperaMaximaDias: masAntiguo }
}

function resumirVentana(filas: PedidoFila[], desde: Date): VentanaVentas {
  const limite = desde.getTime()
  let pedidos = 0
  let facturado = 0

  for (const p of filas) {
    if (new Date(p.created_at).getTime() < limite) continue
    pedidos += 1
    facturado += aNumero(p.subtotal)
  }

  return {
    pedidos,
    facturado,
    // Sin pedidos no hay ticket promedio. Devolver 0 sería mentir y dividir
    // sería "S/ NaN" en pantalla; devolver null obliga a la UI a decidir.
    ticketPromedio: pedidos > 0 ? facturado / pedidos : null,
  }
}

/**
 * Las tres cosas que pueden estar mal con el inventario, en orden de urgencia:
 *
 *  1. SOBREVENDIDO — hay un cliente esperando algo que ya no alcanza. Es el
 *     precio de descontar el stock al confirmar y no al pedir; sin esta
 *     alerta ese costo sería invisible hasta que el cliente reclame.
 *  2. AGOTADO Y PUBLICADO — sigue en la tienda en cero: va a seguir
 *     generando pedidos que no se pueden cumplir.
 *  3. STOCK BAJO — toca reponer, todavía sin daño.
 *
 * Cada producto aparece UNA vez, con su motivo más grave. Los inactivos no
 * entran: no se venden, así que no hay nada que hacer con ellos hoy. Los de
 * `bajo_pedido` tampoco: por definición no llevan inventario.
 */
function construirAlertas(
  productos: ProductoFila[],
  comprometido: ComprometidoFila[],
): AlertaInventario[] {
  const porSku = new Map(comprometido.map((c) => [c.sku, c]))
  const alertas: AlertaInventario[] = []

  for (const p of productos) {
    if (!p.activo || p.bajo_pedido) continue

    const c = porSku.get(p.sku)
    const comprometidas = c?.comprometido ?? 0
    const disponible = c?.disponible_real ?? p.stock

    if (comprometidas > 0 && disponible <= 0) {
      alertas.push({
        sku: p.sku,
        nombre: p.nombre,
        tipo: 'sobrevendido',
        stock: p.stock,
        comprometido: comprometidas,
        detalle:
          disponible === 0
            ? `${comprometidas} comprometidas y ${p.stock} en stock: al confirmar te quedas en cero.`
            : `${comprometidas} comprometidas contra ${p.stock} en stock: faltan ${Math.abs(disponible)}.`,
      })
      continue
    }

    if (p.stock === 0) {
      alertas.push({
        sku: p.sku,
        nombre: p.nombre,
        tipo: 'agotado',
        stock: 0,
        comprometido: comprometidas,
        detalle: 'Agotado y publicado: se sigue mostrando en la tienda sin stock.',
      })
      continue
    }

    if (p.stock <= p.stock_minimo) {
      alertas.push({
        sku: p.sku,
        nombre: p.nombre,
        tipo: 'stock_bajo',
        stock: p.stock,
        comprometido: comprometidas,
        detalle: `Quedan ${p.stock}; el mínimo que fijaste es ${p.stock_minimo}.`,
      })
    }
  }

  const peso: Record<TipoAlerta, number> = {
    sobrevendido: 0,
    agotado: 1,
    stock_bajo: 2,
  }
  return alertas.sort((a, b) => peso[a.tipo] - peso[b.tipo] || a.stock - b.stock)
}

/**
 * Cuánta plata hay parada en el estante. Incluye productos inactivos: el
 * dinero se gastó igual, esté publicado o no.
 */
function valorarInventario(productos: ProductoFila[]): Estadisticas['inventario'] {
  let referencias = 0
  let unidades = 0
  let costo = 0
  let venta = 0

  for (const p of productos) {
    if (p.bajo_pedido || p.stock <= 0) continue
    referencias += 1
    unidades += p.stock
    costo += aNumero(p.costo) * p.stock
    venta += aNumero(p.precio) * p.stock
  }

  return { referencias, unidades, costo, venta, utilidad: venta - costo }
}

function resumirCatalogo(productos: ProductoFila[]): Estadisticas['catalogo'] {
  let activos = 0
  let sinFotoTotal = 0
  let sinFotoActivos = 0

  for (const p of productos) {
    if (p.activo) activos += 1
    if ((p.product_images ?? []).length === 0) {
      sinFotoTotal += 1
      if (p.activo) sinFotoActivos += 1
    }
  }

  return { total: productos.length, activos, sinFotoTotal, sinFotoActivos }
}

/** Top 5 por unidades vendidas. Devuelve [] cuando todavía no hay ventas. */
function rankearVendidos(items: ItemFila[]): MasVendido[] {
  const acumulado = new Map<string, MasVendido>()

  for (const i of items) {
    const previo = acumulado.get(i.sku)
    const linea = aNumero(i.precio_unitario) * i.cantidad
    if (previo) {
      previo.unidades += i.cantidad
      previo.facturado += linea
    } else {
      acumulado.set(i.sku, {
        sku: i.sku,
        // El nombre se guarda en la línea del pedido: es el que tenía el
        // producto cuando se vendió, aunque hoy se llame distinto o ya no exista.
        nombre: i.nombre,
        unidades: i.cantidad,
        facturado: linea,
      })
    }
  }

  return [...acumulado.values()]
    .sort((a, b) => b.unidades - a.unidades || b.facturado - a.facturado)
    .slice(0, 5)
}
