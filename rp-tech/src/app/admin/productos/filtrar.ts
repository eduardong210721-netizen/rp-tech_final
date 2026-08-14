/**
 * Búsqueda, filtro y ORDEN de la lista de productos del panel.
 *
 * Lógica pura, sin React ni Supabase, para poder probarla sola.
 *
 * Se filtra en memoria y no en la consulta a propósito: el catálogo del
 * negocio son ~12 filas y `listAdminProducts()` ya las trae todas para poder
 * contar cuántas hay sin foto. Una consulta por filtro añadiría un viaje a la
 * base y un `or()` interpolado -exactamente la clase de filtro donde ya
 * apareció una inyección en la búsqueda pública (ver sanitizarBusqueda)- sin
 * ganar nada a esta escala.
 */

export type EstadoFiltro = 'todos' | 'activos' | 'inactivos'

export function esEstadoValido(valor: string | undefined): valor is EstadoFiltro {
  return valor === 'todos' || valor === 'activos' || valor === 'inactivos'
}

/**
 * Quita tildes y mayúsculas: quien busca "audifonos" tiene que encontrar
 * "Audífonos". Mismo criterio que `slugify`, sin tabla de reemplazo.
 */
export function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')   // marcas diacriticas (tildes)
    .toLowerCase()
    .trim()
}

/** Lo mínimo que necesita el filtro. No pide un AdminProduct entero para que la prueba no tenga que construir uno. */
export type ProductoFiltrable = {
  sku: string
  nombre: string
  marca: string | null
  categoria_id: string | null
  activo: boolean
}

export type Filtro = {
  q?: string
  /** id de categoría; `undefined` = todas */
  categoriaId?: string | undefined
  estado?: EstadoFiltro
}

/**
 * Cada palabra del término tiene que aparecer en nombre, SKU o marca. Con
 * varias palabras se acumulan (AND): "cable c" encuentra "Cable Tipo C" y no
 * todo lo que tenga una "c".
 */
export function filtrarProductos<T extends ProductoFiltrable>(
  productos: readonly T[],
  filtro: Filtro,
): T[] {
  const palabras = normalizar(filtro.q ?? '').split(' ').filter(Boolean)
  const estado = filtro.estado ?? 'todos'

  return productos.filter((p) => {
    if (estado === 'activos' && !p.activo) return false
    if (estado === 'inactivos' && p.activo) return false
    if (filtro.categoriaId && p.categoria_id !== filtro.categoriaId) return false
    if (palabras.length === 0) return true

    const heno = normalizar(`${p.nombre} ${p.sku} ${p.marca ?? ''}`)
    return palabras.every((palabra) => heno.includes(palabra))
  })
}

/**
 * Orden FIJO alfabético por nombre, con el SKU como desempate.
 *
 * Es una decisión de seguridad, no de estética. El listado anterior se
 * ordenaba por columnas que el dueño edita, así que una fila saltaba de sitio
 * justo después de tocarla y el clic siguiente caía sobre otro producto —el
 * dueño lo reportó como "el producto se mueve cada rato" y en la base
 * aparecieron ajustes de stock que parecen errores de dedo—. Ni el precio ni
 * el stock ni el estado participan del orden: cambiar cualquiera de ellos deja
 * la fila exactamente donde estaba.
 */
export function ordenarProductos<T extends { nombre: string; sku: string }>(
  productos: readonly T[],
): T[] {
  return [...productos].sort(
    (a, b) =>
      a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base', numeric: true }) ||
      a.sku.localeCompare(b.sku, 'es', { numeric: true }),
  )
}
