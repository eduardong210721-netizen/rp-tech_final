/**
 * Reglas puras de la pantalla de stock.
 *
 * Vive aparte de la UI a propósito: son las decisiones que causan (o evitan)
 * un dato equivocado en el inventario, así que se prueban con vitest sin
 * montar React ni tocar la base.
 *
 * NADA de este archivo ordena la lista. El orden es responsabilidad de la
 * consulta (por SKU, ascendente) y no puede depender del stock — reordenar
 * por una columna que el dueño está editando es justamente el defecto que
 * esta pantalla existe para corregir.
 */

/** Lo mínimo que la pantalla necesita de un producto. Sin costo ni margen. */
export type ItemStock = {
  id: string
  sku: string
  nombre: string
  categoriaSlug: string | null
  categoriaNombre: string | null
  stock: number
  stockMinimo: number
  bajoPedido: boolean
  activo: boolean
  /** Unidades en pedidos pendientes de confirmar. */
  comprometido: number
}

export type Nivel = 'agotado' | 'bajo' | 'normal' | 'bajo-pedido'

/**
 * Nivel de un producto. `agotado` se separa de `bajo` (el dominio los junta en
 * `stock_bajo`) porque no son la misma urgencia: uno es "repón pronto", el otro
 * es "ya no puedes vender esto".
 */
export function nivelStock(item: {
  stock: number
  stockMinimo: number
  bajoPedido: boolean
}): Nivel {
  if (item.bajoPedido) return 'bajo-pedido'
  if (item.stock <= 0) return 'agotado'
  if (item.stock <= item.stockMinimo) return 'bajo'
  return 'normal'
}

/** stock físico menos lo prometido en pedidos sin confirmar. Puede ser negativo. */
export function disponibleReal(item: { stock: number; comprometido: number }): number {
  return item.stock - item.comprometido
}

export const FILTROS_ESTADO = ['todos', 'agotado', 'bajo', 'normal', 'comprometido'] as const
export type FiltroEstado = (typeof FILTROS_ESTADO)[number]

export function esFiltroEstado(valor: string | undefined): valor is FiltroEstado {
  return typeof valor === 'string' && (FILTROS_ESTADO as readonly string[]).includes(valor)
}

/**
 * Minúsculas y sin tildes. El dueño escribe "audifonos" y el producto se llama
 * "Audífonos": si la búsqueda no normaliza, la pantalla parece rota.
 */
export function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
}

export type Criterios = {
  q?: string | undefined
  estado?: FiltroEstado | undefined
  categoria?: string | undefined
}

/**
 * Filtra sin reordenar nunca: devuelve los elementos en el mismo orden en que
 * llegaron. El filtro es en memoria porque el catálogo del negocio son once
 * productos y así la búsqueda no puede convertirse en un vector de inyección
 * sobre PostgREST (ver `sanitizarBusqueda` para el caso público).
 */
export function filtrarStock(items: readonly ItemStock[], criterios: Criterios): ItemStock[] {
  const termino = normalizar(criterios.q ?? '')
  const estado = criterios.estado ?? 'todos'
  const categoria = criterios.categoria

  return items.filter((item) => {
    if (categoria && item.categoriaSlug !== categoria) return false

    if (termino) {
      const heno = `${normalizar(item.nombre)} ${normalizar(item.sku)}`
      if (!heno.includes(termino)) return false
    }

    if (estado === 'todos') return true
    if (estado === 'comprometido') return item.comprometido > 0
    return nivelStock(item) === estado
  })
}

export type Resumen = Record<Nivel | 'todos' | 'comprometido', number>

/** Conteo por nivel para las pastillas de filtro. Doblan como leyenda de color. */
export function resumirNiveles(items: readonly ItemStock[]): Resumen {
  const resumen: Resumen = {
    todos: items.length,
    agotado: 0,
    bajo: 0,
    normal: 0,
    'bajo-pedido': 0,
    comprometido: 0,
  }
  for (const item of items) {
    resumen[nivelStock(item)] += 1
    if (item.comprometido > 0) resumen.comprometido += 1
  }
  return resumen
}

/** Tope defensivo: nadie repone cien mil unidades en una tienda de accesorios. */
export const AJUSTE_MAXIMO = 9999

/**
 * Recorta el ajuste pendiente al rango aplicable. El suelo es `-stock`: la
 * previsualización nunca muestra un destino negativo, así el dueño ve "2 → 0"
 * en vez de pulsar Aplicar y recibir un error.
 *
 * La base es la última defensa igual: `ajustar_stock` rechaza cualquier delta
 * que deje el stock por debajo de cero.
 */
export function limitarDelta(stock: number, delta: number): number {
  if (!Number.isFinite(delta)) return 0
  const entero = Math.trunc(delta)
  const suelo = -Math.max(stock, 0)
  const acotado = Math.min(AJUSTE_MAXIMO, Math.max(suelo, entero))
  // Con stock 0 el suelo es -0, y `-0` se renderiza como "−0". Se normaliza.
  return acotado === 0 ? 0 : acotado
}

/**
 * Umbral de confirmación.
 *
 * El incidente real fue un 1 → 11: un +10 de un dedo torpe. Por eso la regla
 * absoluta corta en 10.
 *
 * La regla relativa cubre el otro caso: mover más unidades de las que hay es
 * casi siempre un error de tecla (con 1 en el estante, un +5 no es "reponer",
 * es un resbalón). El piso de 3 evita molestar en stocks diminutos, donde
 * cualquier corrección pequeña es normal.
 *
 * Un +1 nunca pregunta. Un +100 siempre pregunta.
 */
export const UMBRAL_ABSOLUTO = 10
export const PISO_RELATIVO = 3

export function requiereConfirmacion(stock: number, delta: number): boolean {
  const magnitud = Math.abs(Math.trunc(delta))
  if (magnitud === 0) return false
  if (magnitud >= UMBRAL_ABSOLUTO) return true
  return magnitud > Math.max(stock, PISO_RELATIVO)
}

/**
 * "+3" / "−3". El signo se muestra SIEMPRE (salvo en el cero, que no tiene
 * dirección): un número sin signo no dice si suma, resta o fija un valor
 * absoluto, y esa ambigüedad es la que llenó el inventario de datos malos.
 *
 * El menos es U+2212, no el guion ASCII: en monoespaciada tiene el mismo ancho
 * que el "+" y no se confunde con un separador.
 */
export function formatearDelta(delta: number): string {
  const entero = Math.trunc(delta)
  if (entero === 0) return '0'
  return entero > 0 ? `+${entero}` : `−${Math.abs(entero)}`
}

/** Lo que el usuario escribió en el campo de ajuste, ya interpretado. */
export type Ajuste = {
  /** Lo que se aplicaría al pulsar el botón. */
  delta: number
  /** Lo que debe mostrar el campo. */
  texto: string
}

/**
 * Traduce el texto crudo del campo de ajuste a (delta, texto a mostrar).
 *
 * Vive aquí y no en el componente porque es la regla que decide qué número
 * acaba en la base, y porque el borrador ya no es estado de la fila sino de la
 * lista (así sobrevive a un cambio de filtro). Dos motivos para probarla sola.
 *
 * Tres casos que parecen detalles y no lo son:
 *
 * - El campo muestra "−3" con el menos tipográfico (U+2212), que es el que se
 *   lee bien; `Number()` sólo entiende el guion ASCII.
 * - Un texto a medio escribir ("−", "+", "1e") NO se borra: el ajuste vale 0 y
 *   el campo conserva lo tecleado. Borrarle las teclas a alguien mientras
 *   escribe es la forma más rápida de que meta otro número.
 * - Si el valor se recorta (pedir −9 con 2 en stock), el campo pasa a mostrar
 *   el valor recortado: el número que se ve tiene que ser el que se aplica.
 */
export function interpretarAjuste(stock: number, valor: string): Ajuste {
  const crudo = valor.replace(/[−–—]/g, '-')
  const numero = crudo.trim() === '' ? 0 : Number(crudo)
  if (!Number.isFinite(numero)) return { delta: 0, texto: valor }
  const limitado = limitarDelta(stock, numero)
  return { delta: limitado, texto: limitado === numero ? valor : formatearDelta(limitado) }
}
