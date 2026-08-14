'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { productFormSchema, slugify } from '@/lib/domain/adminProduct'
import { productUpdateSchema } from './esquemas'

export type ActionResult = { ok: true } | { ok: false; error: string }

/** crearProducto devuelve el id: la foto se sube contra el producto recién creado. */
export type ResultadoCreacion = { ok: true; id: string } | { ok: false; error: string }

/** Postgres: violación de restricción única (sku o slug repetidos). */
const UNIQUE_VIOLATION = '23505'

export async function crearProducto(input: unknown): Promise<ResultadoCreacion> {
  await requireAdmin()

  const parsed = productFormSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]!.message }

  const d = parsed.data
  const { data, error } = await supabaseAdmin()
    .from('products')
    .insert({ ...d, slug: slugify(d.nombre) })
    .select('id')
    .single()

  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      return { ok: false, error: 'Ya existe un producto con ese SKU o nombre.' }
    }
    return { ok: false, error: error.message }
  }

  revalidatePath('/')
  revalidatePath('/admin')
  revalidatePath('/admin/productos')
  return { ok: true, id: (data as { id: string }).id }
}

export async function actualizarProducto(id: string, input: unknown): Promise<ActionResult> {
  await requireAdmin()
  if (!id) return { ok: false, error: 'Falta el identificador del producto.' }

  // productUpdateSchema = el formulario MENOS sku y stock. No es cosmético:
  // al no estar en el esquema, Zod los descarta como claves desconocidas, así
  // que ni un envío hecho a mano contra esta Server Action puede renombrar el
  // SKU (rompería la referencia con order_items) ni escribir un stock
  // absoluto. Ver el comentario largo en ./esquemas.ts.
  const parsed = productUpdateSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]!.message }

  const d = parsed.data
  const nuevoSlug = slugify(d.nombre)

  // El slug ANTES de este update: /producto/[slug] no usa `fetch` de Next
  // (supabase-js hace su propio HTTP), pero Next igual cachea la página
  // renderizada la primera vez que alguien la visita. Sin invalidar la ruta
  // vieja, un producto renombrado seguiría sirviendo su versión cacheada
  // bajo el slug anterior.
  const { data: anterior, error: getError } = await supabaseAdmin()
    .from('products').select('slug').eq('id', id).maybeSingle()
  if (getError) return { ok: false, error: getError.message }

  // Ni `stock` ni `sku` se escriben aquí, y además se listan los campos uno
  // por uno a propósito -igual que toPublicProduct en @/lib/domain/product:
  // una columna sensible no se cuela sola si mañana esto se reescribe como
  // `{ ...d }`-. Entre que el admin abre este formulario y guarda, un
  // cliente puede haber comprado el producto (crear_pedido) o el stock
  // puede haberse ajustado desde /admin/stock; escribir aquí el valor leído
  // al abrir el formulario pisaría ese cambio con un número ya obsoleto
  // (la clase de lost update que crear_pedido con FOR UPDATE existe para
  // eliminar). /admin/stock, vía la RPC relativa ajustar_stock, es el único
  // escritor de esta columna para productos ya existentes. crearProducto sí
  // puede fijar un stock inicial: un producto nuevo no tiene pedidos
  // concurrentes todavía.
  const { error } = await supabaseAdmin()
    .from('products')
    .update({
      nombre: d.nombre,
      descripcion_corta: d.descripcion_corta,
      descripcion_larga: d.descripcion_larga,
      marca: d.marca,
      modelo: d.modelo,
      especificaciones: d.especificaciones,
      categoria_id: d.categoria_id,
      precio: d.precio,
      costo: d.costo,
      stock_minimo: d.stock_minimo,
      bajo_pedido: d.bajo_pedido,
      activo: d.activo,
      garantia_meses: d.garantia_meses,
      slug: nuevoSlug,
    })
    .eq('id', id)

  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      return { ok: false, error: 'Ya existe un producto con ese SKU o nombre.' }
    }
    return { ok: false, error: error.message }
  }

  revalidatePath('/')
  revalidatePath('/admin')
  revalidatePath('/admin/productos')
  revalidatePath(`/producto/${nuevoSlug}`)
  if (anterior && anterior.slug !== nuevoSlug) revalidatePath(`/producto/${anterior.slug}`)
  return { ok: true }
}

/**
 * Desactiva el producto (activo = false). NUNCA borra la fila: order_items
 * referencia products, y borrar rompería el histórico de pedidos ya hechos.
 */
export async function eliminarProducto(id: string): Promise<ActionResult> {
  await requireAdmin()
  if (!id) return { ok: false, error: 'Falta el identificador del producto.' }

  // Se necesita el slug para poder invalidar su página pública: sin esto,
  // un producto ya visitado seguiría sirviendo su ficha cacheada después
  // de desactivarlo (aunque desaparezca de los listados).
  const { data: producto, error: getError } = await supabaseAdmin()
    .from('products').select('slug').eq('id', id).maybeSingle()
  if (getError) return { ok: false, error: getError.message }

  const { error } = await supabaseAdmin()
    .from('products')
    .update({ activo: false })
    .eq('id', id)

  if (error) return { ok: false, error: error.message }

  revalidatePath('/')
  revalidatePath('/admin')
  revalidatePath('/admin/productos')
  if (producto) revalidatePath(`/producto/${producto.slug}`)
  return { ok: true }
}
