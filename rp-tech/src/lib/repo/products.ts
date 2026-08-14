import 'server-only'
import { cache } from 'react'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { sanitizarBusqueda } from '@/lib/domain/search'
import { esConectorValido } from '@/lib/domain/conector'
import {
  toPublicProduct,
  toAdminProduct,
  type ProductRow,
  type ImageRow,
  type PublicProduct,
  type AdminProduct,
} from '@/lib/domain/product'

export type Category = { id: string; slug: string; nombre: string; orden: number }

const SELECT_PRODUCTO = '*, product_images(*)'

type RowConImagenes = ProductRow & { product_images: ImageRow[] }

/**
 * Los errores se LANZAN. Nada de `console.warn` + array vacío: una página en
 * blanco sin causa visible fue uno de los peores defectos de la v1.
 */
function assertOk(error: { message: string } | null, contexto: string): void {
  if (error) throw new Error(`${contexto}: ${error.message}`)
}

/**
 * Criterios de ordenamiento del catálogo. La lista es cerrada a propósito:
 * el valor llega desde la URL, así que nunca se interpola texto del usuario
 * en la consulta. Cualquier valor desconocido cae en 'relevancia'.
 */
export const ORDENES = {
  relevancia: { etiqueta: 'Destacados', columna: 'nombre', asc: true },
  'precio-asc': { etiqueta: 'Precio: menor a mayor', columna: 'precio', asc: true },
  'precio-desc': { etiqueta: 'Precio: mayor a menor', columna: 'precio', asc: false },
  nombre: { etiqueta: 'Nombre A-Z', columna: 'nombre', asc: true },
} as const

export type OrdenKey = keyof typeof ORDENES

export function esOrdenValido(v: string | undefined): v is OrdenKey {
  return typeof v === 'string' && v in ORDENES
}

export async function listPublicProducts(opts?: {
  categoriaSlug?: string
  q?: string
  orden?: string
  conector?: string
}): Promise<PublicProduct[]> {
  const db = supabaseAdmin()
  let query = db.from('products').select(SELECT_PRODUCTO).eq('activo', true)

  // El filtro más importante del catálogo: responde "¿esto entra en mi equipo?".
  // Se valida contra la lista cerrada antes de tocar la consulta, así que el
  // valor nunca llega crudo desde la URL.
  if (esConectorValido(opts?.conector)) {
    query = query.eq('conector', opts.conector)
  }

  if (opts?.categoriaSlug) {
    const { data: cat, error: catErr } = await db
      .from('categories').select('id').eq('slug', opts.categoriaSlug).maybeSingle()
    assertOk(catErr, 'listPublicProducts/categoria')
    if (!cat) return []
    query = query.eq('categoria_id', cat.id)
  }

  const termino = sanitizarBusqueda(opts?.q ?? '')
  if (termino) {
    const patron = `%${termino}%`
    query = query.or(`nombre.ilike.${patron},sku.ilike.${patron},marca.ilike.${patron}`)
  }

  const orden = esOrdenValido(opts?.orden) ? ORDENES[opts.orden] : ORDENES.relevancia
  const { data, error } = await query.order(orden.columna, { ascending: orden.asc })
  assertOk(error, 'listPublicProducts')

  return (data as RowConImagenes[]).map((r) => toPublicProduct(r, r.product_images ?? []))
}

/**
 * Productos que acompañan a una ficha. Prioriza la misma categoría; si no
 * llena el cupo, completa con el resto del catálogo activo.
 *
 * No es un motor de recomendación: con 9 productos eso sería teatro. Es
 * simplemente "qué más vendemos que tenga que ver con esto".
 */
export async function listRelacionados(
  producto: PublicProduct,
  limite = 4,
): Promise<PublicProduct[]> {
  const db = supabaseAdmin()

  const mapear = (filas: RowConImagenes[]) =>
    filas.map((r) => toPublicProduct(r, r.product_images ?? []))

  let acumulado: PublicProduct[] = []

  if (producto.categoria_id) {
    const { data, error } = await db
      .from('products').select(SELECT_PRODUCTO)
      .eq('activo', true)
      .eq('categoria_id', producto.categoria_id)
      .neq('id', producto.id)
      .limit(limite)
    assertOk(error, 'listRelacionados/categoria')
    acumulado = mapear(data as RowConImagenes[])
  }

  if (acumulado.length < limite) {
    const excluidos = [producto.id, ...acumulado.map((p) => p.id)]
    const { data, error } = await db
      .from('products').select(SELECT_PRODUCTO)
      .eq('activo', true)
      .not('id', 'in', `(${excluidos.join(',')})`)
      .limit(limite - acumulado.length)
    assertOk(error, 'listRelacionados/resto')
    acumulado = [...acumulado, ...mapear(data as RowConImagenes[])]
  }

  return acumulado
}

/**
 * cache() de React: generateMetadata y el componente de página la llaman por
 * separado durante el mismo render; sin memoizar serían dos consultas a la DB.
 */
export const getPublicProductBySlug = cache(async (slug: string): Promise<PublicProduct | null> => {
  const { data, error } = await supabaseAdmin()
    .from('products').select(SELECT_PRODUCTO)
    .eq('slug', slug).eq('activo', true).maybeSingle()
  assertOk(error, 'getPublicProductBySlug')
  if (!data) return null
  const row = data as RowConImagenes
  return toPublicProduct(row, row.product_images ?? [])
})

export async function listAllPublicSlugs(): Promise<string[]> {
  const { data, error } = await supabaseAdmin()
    .from('products').select('slug').eq('activo', true)
  assertOk(error, 'listAllPublicSlugs')
  return (data as { slug: string }[]).map((r) => r.slug)
}

/** Incluye inactivos y el costo. Solo para rutas de admin ya autenticadas. */
export async function listAdminProducts(): Promise<AdminProduct[]> {
  const { data, error } = await supabaseAdmin()
    .from('products').select(SELECT_PRODUCTO).order('sku')
  assertOk(error, 'listAdminProducts')
  return (data as RowConImagenes[]).map((r) => toAdminProduct(r, r.product_images ?? []))
}

/** Un producto por id, con costo incluido. Solo para rutas de admin ya autenticadas. */
export async function getAdminProductById(id: string): Promise<AdminProduct | null> {
  const { data, error } = await supabaseAdmin()
    .from('products').select(SELECT_PRODUCTO).eq('id', id).maybeSingle()
  assertOk(error, 'getAdminProductById')
  if (!data) return null
  const row = data as RowConImagenes
  return toAdminProduct(row, row.product_images ?? [])
}

export async function listCategories(): Promise<Category[]> {
  const { data, error } = await supabaseAdmin()
    .from('categories').select('*').order('orden')
  assertOk(error, 'listCategories')
  return data as Category[]
}
