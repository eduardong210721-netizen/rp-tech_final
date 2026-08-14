/**
 * Reglas puras de la pantalla de pedidos: tipos, etiquetas, filtro, búsqueda
 * y los textos que se copian o se envían por WhatsApp.
 *
 * Vive aparte de los componentes por dos motivos. Uno, se puede testear con
 * Vitest (un archivo `'use server'` o un Server Component no se puede
 * importar desde un test). Dos, lo importan tanto la página (servidor) como
 * la tarjeta (cliente): no debe arrastrar nada de `server-only`.
 */

import { NEGOCIO, METODOS_PAGO } from '@/lib/negocio'

/** Ciclo de vida de un pedido, en orden. */
export const ESTADOS = ['pendiente', 'confirmado', 'entregado', 'cancelado'] as const

export type OrderEstado = (typeof ESTADOS)[number]

export function esEstadoValido(valor: unknown): valor is OrderEstado {
  return typeof valor === 'string' && (ESTADOS as readonly string[]).includes(valor)
}

export type OrderItemRow = {
  id: string
  sku: string
  nombre: string
  precio_unitario: number
  cantidad: number
  /** ¿Esta línea ya movió inventario? Lo pone `confirmar_pedido()`. */
  stock_descontado: boolean
  /** El producto sigue en el catálogo (no fue borrado después del pedido). */
  existe_producto: boolean
  /** `confirmar_pedido()` salta las líneas bajo pedido: no manejan stock. */
  bajo_pedido: boolean
}

/**
 * ¿Confirmar este pedido movería el inventario de esta línea?
 *
 * `confirmar_pedido()` salta dos casos: producto borrado del catálogo
 * (`product_id is null`) y producto bajo pedido. Si la pantalla no repitiera
 * esa regla, prometería descontar unidades que la base nunca va a descontar.
 */
export function lineaMueveStock(item: OrderItemRow): boolean {
  return item.existe_producto && !item.bajo_pedido
}

export type NotaLinea = { texto: string; descontado: boolean }

/**
 * Lo que dice cada línea sobre su propio stock. Nunca un color a secas.
 *
 * Hace falta el estado del pedido, no basta la bandera: `cancelar_pedido()`
 * devuelve el stock pero NO vuelve a poner `stock_descontado` en false. Leer
 * la columna a secas haría que una línea cancelada —cuyas unidades están otra
 * vez en el estante— siguiera diciendo "Stock descontado".
 */
export function notaStockLinea(item: OrderItemRow, estado: OrderEstado): NotaLinea {
  if (estado === 'cancelado') {
    return item.stock_descontado
      ? { texto: 'Stock devuelto', descontado: false }
      : { texto: 'Nunca movió stock', descontado: false }
  }
  if (item.stock_descontado) return { texto: 'Stock descontado', descontado: true }
  if (!item.existe_producto) {
    return { texto: 'Producto retirado · sin stock que mover', descontado: false }
  }
  if (item.bajo_pedido) return { texto: 'Bajo pedido · no mueve stock', descontado: false }
  return { texto: 'Stock sin descontar', descontado: false }
}

export type OrderRow = {
  id: string
  codigo: string
  cliente_nombre: string
  cliente_telefono: string
  distrito: string
  referencia: string | null
  subtotal: number
  estado: OrderEstado
  created_at: string
}

/** Etiqueta del estado de UN pedido. */
export const ETIQUETA_ESTADO: Record<OrderEstado, string> = {
  pendiente: 'Pendiente',
  confirmado: 'Confirmado',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
}

/** Etiqueta del filtro, que habla de un grupo. */
export const ETIQUETA_FILTRO: Record<OrderEstado, string> = {
  pendiente: 'Pendientes',
  confirmado: 'Confirmados',
  entregado: 'Entregados',
  cancelado: 'Cancelados',
}

/**
 * Qué significa el estado de ESTE pedido para el inventario, con las
 * unidades reales. Es la parte que el dueño reportó como confusa ("es raro
 * que el stock se descuente, todavía no se confirmó la venta"), así que va
 * escrita en la tarjeta, no solo en el color.
 */
export function notaStockPedido(
  estado: OrderEstado,
  n: { porDescontar: number; porDevolver: number },
): string {
  switch (estado) {
    case 'pendiente':
      return n.porDescontar > 0
        ? `Descuenta ${unidades(n.porDescontar)} del stock. Es el momento en que el pedido cuenta como venta.`
        : 'No mueve stock: ninguna línea de este pedido descuenta inventario.'
    case 'confirmado':
      return 'Stock descontado. Falta entregar.'
    case 'entregado':
      return 'Entregado. El stock se descontó al confirmar.'
    case 'cancelado':
      if (n.porDevolver === 0) return 'Cancelado. Nunca llegó a descontar stock.'
      return n.porDevolver === 1
        ? 'Cancelado. Se devolvió 1 unidad al stock.'
        : `Cancelado. Se devolvieron ${n.porDevolver} unidades al stock.`
  }
}

/** Minúsculas y sin tildes: "Pérez" y "perez" son la misma búsqueda. */
function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
}

function soloDigitos(texto: string): string {
  return texto.replace(/\D/g, '')
}

type Buscable = Pick<OrderRow, 'codigo' | 'cliente_nombre' | 'cliente_telefono' | 'distrito'>

/**
 * ¿Este pedido coincide con lo que se escribió en el buscador?
 *
 * La búsqueda se resuelve en el servidor sobre el arreglo ya traído, NO
 * interpolando el texto en un `or()` de PostgREST. Esa interpolación es
 * exactamente el agujero documentado en `@/lib/domain/search`: una coma
 * convierte la búsqueda en un filtro arbitrario sobre columnas privadas
 * (costo, margen). Aquí no hay nada que sanear porque el texto nunca llega
 * a la base.
 *
 * El celular se compara por dígitos: el dueño lo copia del chat con espacios,
 * guiones o +51 delante, y debe encontrarlo igual.
 */
export function coincidePedido(pedido: Buscable, termino: string): boolean {
  const q = normalizar(termino)
  if (!q) return true

  const digitos = soloDigitos(q)
  if (digitos.length >= 3 && soloDigitos(pedido.cliente_telefono).includes(digitos)) {
    return true
  }

  return (
    normalizar(pedido.codigo).includes(q) ||
    normalizar(pedido.cliente_nombre).includes(q) ||
    normalizar(pedido.distrito).includes(q)
  )
}

export type FiltroPedidos = { estado?: OrderEstado | undefined; q?: string | undefined }

/**
 * Filtra sin reordenar. El orden lo fija la consulta (más reciente primero) y
 * NO depende del estado: confirmar un pedido cambia su color, nunca su
 * posición. El dueño ya se quejó de una tabla donde las filas se movían solas
 * mientras editaba —perder de vista la fila es lo que hace que se toque el
 * pedido equivocado—.
 */
export function filtrarPedidos<T extends Buscable & { estado: OrderEstado }>(
  pedidos: readonly T[],
  filtro: FiltroPedidos,
): T[] {
  return pedidos.filter((pedido) => {
    if (filtro.estado && pedido.estado !== filtro.estado) return false
    if (filtro.q && !coincidePedido(pedido, filtro.q)) return false
    return true
  })
}

export function contarPorEstado(
  pedidos: readonly { estado: OrderEstado }[],
): Record<OrderEstado, number> {
  const cuenta: Record<OrderEstado, number> = {
    pendiente: 0,
    confirmado: 0,
    entregado: 0,
    cancelado: 0,
  }
  for (const pedido of pedidos) cuenta[pedido.estado] += 1
  return cuenta
}

/**
 * Celular peruano tal como lo guarda el checkout (9 dígitos que empiezan con
 * 9) llevado al formato internacional que pide wa.me.
 *
 * Devuelve `null` si el número no tiene una forma reconocible: abrir un chat
 * con un número inventado es peor que no ofrecer el enlace.
 */
export function telefonoInternacional(telefono: string): string | null {
  const digitos = soloDigitos(telefono)
  if (/^9\d{8}$/.test(digitos)) return `51${digitos}`
  if (/^51\d{9}$/.test(digitos)) return digitos
  return null
}

/** 935423395 -> "935 423 395". Solo presentación. */
export function telefonoLegible(telefono: string): string {
  const digitos = soloDigitos(telefono)
  if (!/^9\d{8}$/.test(digitos)) return telefono
  return `${digitos.slice(0, 3)} ${digitos.slice(3, 6)} ${digitos.slice(6)}`
}

/** Primer nombre, para saludar sin sonar a formulario. */
function primerNombre(nombre: string): string {
  return nombre.trim().split(/\s+/)[0] ?? nombre.trim()
}

type Contactable = Pick<
  OrderRow,
  | 'codigo'
  | 'cliente_nombre'
  | 'cliente_telefono'
  | 'distrito'
  | 'referencia'
  | 'subtotal'
  // El estado decide qué se le pregunta al cliente: un pedido pendiente
  // necesita cerrar pago y entrega, uno confirmado solo la entrega.
  | 'estado'
>

/**
 * Cómo entregamos: recojo en el punto o envío al distrito que dejó el cliente.
 *
 * Se ofrecen las dos, y el distrito se nombra porque el cliente ya lo escribió
 * en el checkout: repetírselo demuestra que el pedido se leyó. El costo del
 * envío NO se promete, porque depende del distrito y no lo sabemos aquí.
 */
function lineaEntrega(distrito: string): string {
  const punto = NEGOCIO.puntoRecojo
  if (!punto) {
    return `Para la entrega, ¿te queda bien en ${distrito}? Coordinamos el punto y la hora.`
  }
  return (
    `Sobre la entrega: puedes recogerlo en ${punto}, ` +
    `o te lo llevamos a ${distrito} y coordinamos el costo del envío.`
  )
}

/**
 * Una línea por producto, con el precio entre paréntesis.
 *
 * Los paréntesis no son un adorno: los nombres del catálogo ya traen rayas
 * ("Cable Apple USB-C a USB-C 240W — 2 m"), así que separar el precio con
 * otra raya lo dejaba pegado al nombre y se leía como parte del producto.
 *
 * La cantidad solo aparece cuando es mayor que uno, y entonces se muestra la
 * multiplicación completa: "S/ 12.00" a secas junto a dos unidades se lee
 * como precio unitario y el cliente cree que le cobran el doble.
 */
function detalleItems(items: ItemMensaje[], formatearMonto: (n: number) => string): string {
  return items
    .map((i) => {
      const total = formatearMonto(i.precio_unitario * i.cantidad)
      const precio =
        i.cantidad > 1 ? `${i.cantidad} × ${formatearMonto(i.precio_unitario)} = ${total}` : total
      return `• ${i.nombre} (${precio})`
    })
    .join('\n')
}

/** "Yape, Plin, Transferencia o Efectivo" — una lista que se lee en voz alta. */
function listaLegible(valores: readonly string[]): string {
  if (valores.length <= 1) return valores[0] ?? ''
  return `${valores.slice(0, -1).join(', ')} o ${valores[valores.length - 1]}`
}

export type ItemMensaje = { nombre: string; cantidad: number; precio_unitario: number }

/**
 * Mensaje ya redactado para el cliente, listo para enviar sin editar.
 *
 * Tres decisiones sobre el texto:
 *
 * 1. **Cambia según el estado.** Preguntarle "¿cómo vas a pagar?" a alguien
 *    cuyo pedido ya confirmaste suena a que no llevas la cuenta de tus
 *    propias ventas. Un pedido pendiente necesita cerrar pago y entrega; uno
 *    confirmado solo necesita coordinar la entrega.
 *
 * 2. **Trata de tú, sin mezclar.** El borrador original decía "te escribo" y
 *    tres palabras después "realizará". Elegir uno y sostenerlo es lo que
 *    hace que un mensaje suene a persona y no a plantilla.
 *
 * 3. **Repite lo que pidió.** Entre que el cliente hace el pedido y el dueño
 *    escribe pueden pasar horas o días. Listar los productos le ahorra tener
 *    que subir en el chat a recordar qué compró.
 *
 * Siempre lleva el código: es lo que evita buscar a mano en qué conversación
 * quedó cada pedido.
 */
export function mensajeParaCliente(
  pedido: Contactable,
  montoFormateado: string,
  items: ItemMensaje[] = [],
  formatearMonto: (n: number) => string = () => '',
): string {
  const nombre = primerNombre(pedido.cliente_nombre)
  const detalle = items.length > 0 ? `\n\n${detalleItems(items, formatearMonto)}` : ''

  if (pedido.estado === 'cancelado') {
    return (
      `Hola ${nombre}, te escribo de RP Tech por tu pedido ${pedido.codigo}. ` +
      `Quedó cancelado. Si sigues interesado, escríbeme y lo vemos.`
    )
  }

  if (pedido.estado === 'entregado') {
    return (
      `Hola ${nombre}, te escribo de RP Tech por tu pedido ${pedido.codigo}. ` +
      `¿Todo bien con lo que recibiste?`
    )
  }

  if (pedido.estado === 'confirmado') {
    return (
      `Hola ${nombre}, tu pedido ${pedido.codigo} de RP Tech ya está confirmado ` +
      `y separado para ti.${detalle}\n\nTotal: ${montoFormateado}\n\n` +
      lineaEntrega(pedido.distrito)
    )
  }

  // Pendiente: falta cerrar pago y entrega. Es el caso normal.
  return (
    `Hola ${nombre}, te escribo de RP Tech por tu pedido ${pedido.codigo}.${detalle}` +
    `\n\nTotal: ${montoFormateado}\n\n` +
    `¿Cómo prefieres pagar? Aceptamos ${listaLegible(METODOS_PAGO)}.\n\n` +
    lineaEntrega(pedido.distrito)
  )
}

/** Enlace de WhatsApp al cliente, o `null` si el número no sirve para wa.me. */
export function whatsappCliente(
  pedido: Contactable,
  montoFormateado: string,
  items: ItemMensaje[] = [],
  formatearMonto: (n: number) => string = () => '',
): string | null {
  const numero = telefonoInternacional(pedido.cliente_telefono)
  if (!numero) return null
  const texto = mensajeParaCliente(pedido, montoFormateado, items, formatearMonto)
  return `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`
}

/**
 * Bloque de entrega listo para pegar en el chat del motorizado. Sin campos
 * vacíos: si no hay referencia, esa línea no existe.
 */
export function textoEntrega(pedido: Contactable): string {
  return [
    pedido.cliente_nombre,
    `Distrito: ${pedido.distrito}`,
    ...(pedido.referencia ? [`Referencia: ${pedido.referencia}`] : []),
    `Celular: ${telefonoLegible(pedido.cliente_telefono)}`,
    `Pedido ${pedido.codigo}`,
  ].join('\n')
}

/**
 * Fecha en la zona de Lima, calculada SIEMPRE en el servidor y enviada ya
 * formateada. Si la formateara el componente cliente, el HTML del servidor
 * (UTC) y el del navegador (hora local) no coincidirían y React lo reportaría
 * como error de hidratación.
 */
const FORMATO_FECHA = new Intl.DateTimeFormat('es-PE', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'America/Lima',
})

export function fechaLima(iso: string): string {
  const fecha = new Date(iso)
  if (Number.isNaN(fecha.getTime())) return ''
  return FORMATO_FECHA.format(fecha)
}

/**
 * Unidades que una cancelación devolvería al stock ahora mismo.
 * `cancelar_pedido()` devuelve SOLO lo que se descontó, así que un pedido
 * que nunca se confirmó devuelve cero. La tarjeta dice exactamente eso.
 */
export function unidadesADevolver(items: readonly OrderItemRow[]): number {
  return items.reduce((total, item) => total + (item.stock_descontado ? item.cantidad : 0), 0)
}

/** Unidades que una confirmación descontaría del stock. */
export function unidadesADescontar(items: readonly OrderItemRow[]): number {
  return items.reduce(
    (total, item) =>
      total + (!item.stock_descontado && lineaMueveStock(item) ? item.cantidad : 0),
    0,
  )
}

/** "3 unidades" / "1 unidad". El plural mal puesto delata una pantalla descuidada. */
export function unidades(n: number): string {
  return n === 1 ? '1 unidad' : `${n} unidades`
}
