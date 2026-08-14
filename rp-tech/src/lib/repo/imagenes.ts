import 'server-only'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { esRutaDeObjetoSegura, type TipoImagen } from '@/lib/domain/imagen'

/**
 * Capa de datos de las fotos de producto: filas de `product_images` y objetos
 * del bucket. Las dos cosas viven aquí juntas porque siempre se mueven juntas
 * —una fila sin objeto es una imagen rota y un objeto sin fila es basura que
 * se acumula en el bucket—.
 */

/**
 * Nombre del bucket. Va SOLO aquí, en `.from(BUCKET)`. La ruta que se guarda
 * en `storage_path` es relativa al bucket y NUNCA lleva "productos/" delante:
 * prefijarla anida los objetos en productos/productos/ y deja todas las URL
 * públicas en 400.
 */
export const BUCKET = 'productos'

export type ImagenProducto = {
  id: string
  product_id: string
  storage_path: string
  alt: string
  orden: number
  es_principal: boolean
}

/** Datos del producto que la subida necesita: el SKU nombra el objeto, el slug invalida su ficha. */
export type ProductoDeImagen = { id: string; sku: string; slug: string }

/** Los errores se LANZAN, igual que en repo/products.ts: nada de fallar en silencio. */
function assertOk(error: { message: string } | null, contexto: string): void {
  if (error) throw new Error(`${contexto}: ${error.message}`)
}

export async function getProductoDeImagen(productId: string): Promise<ProductoDeImagen | null> {
  const { data, error } = await supabaseAdmin()
    .from('products')
    .select('id, sku, slug')
    .eq('id', productId)
    .maybeSingle()
  assertOk(error, 'getProductoDeImagen')
  return (data as ProductoDeImagen | null) ?? null
}

/**
 * Las imágenes de un producto, en el mismo orden en que las muestra la ficha
 * pública (`ordenarImagenes` de @/lib/domain/product): la principal primero y
 * el resto por `orden`. Así lo que el dueño ve en el panel es exactamente lo
 * que verá el cliente.
 */
export async function listImagenesDeProducto(productId: string): Promise<ImagenProducto[]> {
  const { data, error } = await supabaseAdmin()
    .from('product_images')
    .select('id, product_id, storage_path, alt, orden, es_principal')
    .eq('product_id', productId)
    .order('es_principal', { ascending: false })
    .order('orden', { ascending: true })
    .order('id', { ascending: true })
  assertOk(error, 'listImagenesDeProducto')
  return (data ?? []) as ImagenProducto[]
}

export async function getImagen(id: string): Promise<ImagenProducto | null> {
  const { data, error } = await supabaseAdmin()
    .from('product_images')
    .select('id, product_id, storage_path, alt, orden, es_principal')
    .eq('id', id)
    .maybeSingle()
  assertOk(error, 'getImagen')
  return (data as ImagenProducto | null) ?? null
}

/**
 * Sube el objeto. `upsert: false` a propósito: si por lo que sea el nombre ya
 * existiera, se quiere un error ruidoso y no pisar en silencio la foto de otro
 * producto.
 */
export async function subirObjeto(
  nombre: string,
  bytes: Uint8Array,
  tipo: TipoImagen,
): Promise<void> {
  if (!esRutaDeObjetoSegura(nombre)) {
    throw new Error(`subirObjeto: nombre de objeto inseguro (${nombre})`)
  }
  const { error } = await supabaseAdmin()
    .storage.from(BUCKET)
    .upload(nombre, bytes, { contentType: tipo, upsert: false })
  assertOk(error, 'subirObjeto')
}

/**
 * Borra el objeto del bucket. La ruta viene de la base, pero se vuelve a
 * comprobar: un `storage_path` con "/" o ".." convertiría el borrado de una
 * foto en el borrado de otra ruta cualquiera.
 */
export async function eliminarObjeto(ruta: string): Promise<void> {
  if (!esRutaDeObjetoSegura(ruta)) {
    throw new Error(`eliminarObjeto: ruta insegura (${ruta})`)
  }
  const { error } = await supabaseAdmin().storage.from(BUCKET).remove([ruta])
  assertOk(error, 'eliminarObjeto')
}

export async function crearFilaImagen(fila: {
  product_id: string
  storage_path: string
  alt: string
  orden: number
  es_principal: boolean
}): Promise<void> {
  const { error } = await supabaseAdmin().from('product_images').insert(fila)
  assertOk(error, 'crearFilaImagen')
}

export async function eliminarFilaImagen(id: string): Promise<void> {
  const { error } = await supabaseAdmin().from('product_images').delete().eq('id', id)
  assertOk(error, 'eliminarFilaImagen')
}

export async function actualizarAltImagen(id: string, alt: string): Promise<void> {
  const { error } = await supabaseAdmin().from('product_images').update({ alt }).eq('id', id)
  assertOk(error, 'actualizarAltImagen')
}

/**
 * Mueve la marca de principal. El índice único parcial
 * `product_images_max_una_principal` impide DOS principales, así que hay que
 * APAGAR la anterior antes de encender la nueva; al revés el UPDATE choca con
 * el índice y no pasa nada.
 *
 * Entre los dos UPDATE el producto se queda sin principal durante unos
 * milisegundos. Si el proceso se cayera justo ahí, `garantizarUnaPrincipal()`
 * —que se llama al final de toda mutación— lo repara en la siguiente pasada.
 */
export async function fijarPrincipal(productId: string, imagenId: string): Promise<void> {
  const db = supabaseAdmin()

  const { error: apagar } = await db
    .from('product_images')
    .update({ es_principal: false })
    .eq('product_id', productId)
    .eq('es_principal', true)
  assertOk(apagar, 'fijarPrincipal/apagar')

  const { error: encender } = await db
    .from('product_images')
    .update({ es_principal: true })
    .eq('id', imagenId)
    .eq('product_id', productId)
  assertOk(encender, 'fijarPrincipal/encender')
}

/** Intercambia el `orden` de dos imágenes. No hay unicidad en `orden`: dos UPDATE bastan. */
export async function intercambiarOrden(
  a: { id: string; orden: number },
  b: { id: string; orden: number },
): Promise<void> {
  const db = supabaseAdmin()
  const { error: e1 } = await db.from('product_images').update({ orden: b.orden }).eq('id', a.id)
  assertOk(e1, 'intercambiarOrden/a')
  const { error: e2 } = await db.from('product_images').update({ orden: a.orden }).eq('id', b.id)
  assertOk(e2, 'intercambiarOrden/b')
}

/**
 * Invariante que el esquema NO puede exigir: el índice parcial impide dos
 * principales pero no impide cero, y un producto sin principal se queda sin
 * foto en la tarjeta, en la ficha, en el carrito y en la vista previa de
 * WhatsApp aunque tenga imágenes cargadas.
 *
 * Se llama al final de cada mutación. Si el producto tiene imágenes y ninguna
 * es principal, asciende la primera del orden.
 */
export async function garantizarUnaPrincipal(productId: string): Promise<void> {
  const imagenes = await listImagenesDeProducto(productId)
  if (imagenes.length === 0) return
  if (imagenes.some((i) => i.es_principal)) return

  const siguiente = imagenes[0]
  if (!siguiente) return
  const { error } = await supabaseAdmin()
    .from('product_images')
    .update({ es_principal: true })
    .eq('id', siguiente.id)
  assertOk(error, 'garantizarUnaPrincipal')
}
