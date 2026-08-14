import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { CATEGORIAS, PRODUCTOS } from './data/catalogo.ts'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) throw new Error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY')

const db = createClient(url, key, { auth: { persistSession: false } })
const DIR_IMG = path.join(process.cwd(), 'scripts', 'imagenes')

/**
 * Costos reales, desde un archivo local que git ignora.
 *
 * El costo revela el margen de cada producto y este repositorio puede acabar
 * siendo público, así que no viaja en el código. `catalogo.ts` los deja en 0 y
 * aquí se sobreescriben si existe `scripts/data/costos.local.json`:
 *
 *   { "26002": 8.5, "26003": 6 }
 *
 * Sembrar sin ese archivo produce un catálogo correcto de cara al cliente; solo
 * el margen del panel sale en cero hasta que el dueño cargue los costos desde
 * `/admin`.
 */
const COSTOS: Record<string, number> = await (async () => {
  const ruta = path.join(process.cwd(), 'scripts', 'data', 'costos.local.json')
  try {
    return JSON.parse(await readFile(ruta, 'utf8')) as Record<string, number>
  } catch {
    console.warn(
      '[seed] Sin scripts/data/costos.local.json: los productos se siembran con ' +
        'costo 0. Cárgalos desde /admin o crea ese archivo.',
    )
    return {}
  }
})()

function costoDe(sku: string): number {
  return COSTOS[sku] ?? 0
}

async function main() {
  // 1. Categorías
  const { data: cats, error: catErr } = await db
    .from('categories')
    .upsert(CATEGORIAS, { onConflict: 'slug' })
    .select('id, slug')
  if (catErr) throw new Error(`categorias: ${catErr.message}`)
  const catId = new Map(cats!.map((c) => [c.slug, c.id]))
  console.log(`✓ ${cats!.length} categorías`)

  for (const p of PRODUCTOS) {
    // 2. Producto
    const categoria_id = catId.get(p.categoria)
    if (!categoria_id) throw new Error(`${p.sku}: categoría desconocida "${p.categoria}"`)

    const { data: prod, error: prodErr } = await db
      .from('products')
      .upsert({
        sku: p.sku, slug: p.slug, nombre: p.nombre,
        descripcion_corta: p.descripcion_corta, descripcion_larga: p.descripcion_larga,
        marca: p.marca, modelo: p.modelo, especificaciones: p.especificaciones,
        categoria_id, precio: p.precio, costo: costoDe(p.sku), stock: p.stock,
        activo: p.activo, garantia_meses: p.garantia_meses,
      }, { onConflict: 'sku' })
      .select('id').single()
    if (prodErr) throw new Error(`${p.sku}: ${prodErr.message}`)

    // 3. Imagen
    if (p.imagen) {
      const bytes = await readFile(path.join(DIR_IMG, p.imagen))
      // Ruta DENTRO del bucket, sin repetir su nombre: `.from('productos')` ya lo fija.
      // Prefijarla con `productos/` anidaba los objetos en productos/productos/ y
      // dejaba todas las imagenes en 400.
      const storagePath = `${p.sku}.webp`

      const { error: upErr } = await db.storage
        .from('productos')
        .upload(storagePath, bytes, { contentType: 'image/webp', upsert: true })
      if (upErr) throw new Error(`${p.sku} storage: ${upErr.message}`)

      await db.from('product_images').delete().eq('product_id', prod!.id)
      const { error: imgErr } = await db.from('product_images').insert({
        product_id: prod!.id, storage_path: storagePath,
        alt: p.alt, orden: 0, es_principal: true,
      })
      if (imgErr) throw new Error(`${p.sku} imagen: ${imgErr.message}`)
    }

    console.log(`✓ ${p.sku} ${p.nombre}${p.activo ? '' : '  (inactivo)'}`)
  }

  console.log(`\nListo: ${PRODUCTOS.length} productos sembrados.`)
}

main().catch((e) => { console.error('\n✗', e.message); process.exit(1) })
