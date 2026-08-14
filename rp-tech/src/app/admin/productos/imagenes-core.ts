import { randomUUID } from 'node:crypto'
import {
  nombreObjetoSeguro,
  validarAlt,
  validarArchivoImagen,
  MAX_IMAGENES,
} from '@/lib/domain/imagen'
import {
  crearFilaImagen,
  eliminarFilaImagen,
  eliminarObjeto,
  fijarPrincipal,
  garantizarUnaPrincipal,
  getImagen,
  getProductoDeImagen,
  intercambiarOrden,
  listImagenesDeProducto,
  subirObjeto,
  actualizarAltImagen,
} from '@/lib/repo/imagenes'

/**
 * El QUÉ de la gestión de imágenes, separado del CÓMO se invoca.
 *
 * Las Server Actions de imagenes-actions.ts son una cáscara: comprueban que
 * quien llama es admin, traducen el FormData y revalidan rutas. Toda la
 * lógica que hay que poder verificar contra la base real —el orden de los
 * borrados, la promoción de la principal, la limpieza del objeto cuando la
 * fila no entra— vive aquí, en funciones que no dependen de `next/headers`
 * ni de un ciclo de request y por eso se pueden ejecutar desde un script.
 *
 * Cada función devuelve el `slug` del producto tocado para que la action sepa
 * qué ficha pública invalidar.
 */

export type ResultadoCore =
  | { ok: true; slug: string | null }
  | { ok: false; error: string }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Sufijo aleatorio del nombre del objeto: 12 hex del uuid v4. */
function sufijoAleatorio(): string {
  return randomUUID().replace(/-/g, '').slice(0, 12)
}

export async function subirImagenCore(
  productId: string,
  entrada: { nombreArchivo: string; tamano: number; bytes: Uint8Array; alt: unknown },
): Promise<ResultadoCore> {
  if (!UUID.test(productId)) return { ok: false, error: 'Falta el identificador del producto.' }

  const producto = await getProductoDeImagen(productId)
  if (!producto) return { ok: false, error: 'Ese producto ya no existe.' }

  const alt = validarAlt(entrada.alt)
  if (!alt.ok) return { ok: false, error: alt.error }

  const validacion = validarArchivoImagen({
    nombre: entrada.nombreArchivo,
    tamano: entrada.tamano,
    bytes: entrada.bytes,
  })
  if (!validacion.ok) return { ok: false, error: validacion.error }

  const existentes = await listImagenesDeProducto(productId)
  if (existentes.length >= MAX_IMAGENES) {
    return { ok: false, error: `Este producto ya tiene ${MAX_IMAGENES} fotos, el máximo.` }
  }

  // El nombre lo compone el servidor con el SKU normalizado más un sufijo
  // aleatorio. El nombre que mandó el cliente no se usa nunca, ni su extensión.
  const nombre = nombreObjetoSeguro(producto.sku, validacion.tipo, sufijoAleatorio())

  await subirObjeto(nombre, entrada.bytes, validacion.tipo)

  try {
    const siguienteOrden = existentes.reduce((max, i) => Math.max(max, i.orden), -1) + 1
    await crearFilaImagen({
      product_id: productId,
      storage_path: nombre,
      alt: alt.alt,
      orden: siguienteOrden,
      // La primera foto de un producto es su principal sin que nadie lo pida:
      // el índice parcial impide dos principales, pero no impide cero.
      es_principal: existentes.length === 0,
    })
  } catch (e) {
    // La fila no entró: sin esto, el objeto recién subido se queda huérfano
    // en el bucket para siempre.
    await eliminarObjeto(nombre).catch(() => {})
    throw e
  }

  await garantizarUnaPrincipal(productId)
  return { ok: true, slug: producto.slug }
}

/**
 * Borra una foto: primero el objeto del bucket, después la fila.
 *
 * El orden es deliberado. Al revés, si fallara el borrado del objeto quedaría
 * un huérfano que ninguna fila recuerda. Así, si lo que falla es el borrado de
 * la fila, el reintento vuelve a pasar por aquí: `remove()` sobre un objeto
 * que ya no existe no es error y la fila se va a la segunda. Este fallo se
 * repara solo; el huérfano no.
 */
export async function eliminarImagenCore(imagenId: string): Promise<ResultadoCore> {
  if (!UUID.test(imagenId)) return { ok: false, error: 'Falta el identificador de la imagen.' }

  const imagen = await getImagen(imagenId)
  if (!imagen) return { ok: false, error: 'Esa imagen ya no existe.' }

  const producto = await getProductoDeImagen(imagen.product_id)

  await eliminarObjeto(imagen.storage_path)
  await eliminarFilaImagen(imagenId)

  // Si la borrada era la principal y quedan otras, asciende la siguiente: un
  // producto con fotos nunca puede quedarse sin principal.
  await garantizarUnaPrincipal(imagen.product_id)

  return { ok: true, slug: producto?.slug ?? null }
}

export async function marcarPrincipalCore(imagenId: string): Promise<ResultadoCore> {
  if (!UUID.test(imagenId)) return { ok: false, error: 'Falta el identificador de la imagen.' }

  const imagen = await getImagen(imagenId)
  if (!imagen) return { ok: false, error: 'Esa imagen ya no existe.' }

  if (!imagen.es_principal) {
    await fijarPrincipal(imagen.product_id, imagenId)
    await garantizarUnaPrincipal(imagen.product_id)
  }

  const producto = await getProductoDeImagen(imagen.product_id)
  return { ok: true, slug: producto?.slug ?? null }
}

/**
 * Sube o baja una foto un puesto.
 *
 * La galería se muestra en el MISMO orden que la ficha pública
 * (`ordenarImagenes` de @/lib/domain/product): la principal primero y el resto
 * por `orden`. Por eso mover opera solo sobre las no principales —la principal
 * está clavada arriba y se cambia con "Hacer principal"—. Así lo que se ve al
 * reordenar es lo que verá el cliente.
 */
export async function moverImagenCore(
  imagenId: string,
  direccion: 'arriba' | 'abajo',
): Promise<ResultadoCore> {
  if (!UUID.test(imagenId)) return { ok: false, error: 'Falta el identificador de la imagen.' }
  if (direccion !== 'arriba' && direccion !== 'abajo') {
    return { ok: false, error: 'Dirección no válida.' }
  }

  const imagen = await getImagen(imagenId)
  if (!imagen) return { ok: false, error: 'Esa imagen ya no existe.' }

  const producto = await getProductoDeImagen(imagen.product_id)
  if (imagen.es_principal) return { ok: true, slug: producto?.slug ?? null } // va primera por definición

  const imagenes = (await listImagenesDeProducto(imagen.product_id))
    .filter((x) => !x.es_principal)
    .sort((a, b) => a.orden - b.orden || a.id.localeCompare(b.id))

  const i = imagenes.findIndex((x) => x.id === imagenId)
  const actual = imagenes[i]
  const vecina = imagenes[direccion === 'arriba' ? i - 1 : i + 1]
  if (!actual || !vecina) return { ok: true, slug: producto?.slug ?? null } // ya está en la punta

  // Dos filas creadas a la vez pueden compartir `orden`; sin esto el
  // intercambio no movería nada y el botón parecería roto.
  const ordenA = actual.orden
  const ordenB =
    vecina.orden === ordenA ? (direccion === 'arriba' ? ordenA - 1 : ordenA + 1) : vecina.orden

  await intercambiarOrden({ id: actual.id, orden: ordenA }, { id: vecina.id, orden: ordenB })
  return { ok: true, slug: producto?.slug ?? null }
}

export async function guardarAltCore(imagenId: string, alt: unknown): Promise<ResultadoCore> {
  if (!UUID.test(imagenId)) return { ok: false, error: 'Falta el identificador de la imagen.' }

  const validacion = validarAlt(alt)
  if (!validacion.ok) return { ok: false, error: validacion.error }

  const imagen = await getImagen(imagenId)
  if (!imagen) return { ok: false, error: 'Esa imagen ya no existe.' }

  await actualizarAltImagen(imagenId, validacion.alt)

  const producto = await getProductoDeImagen(imagen.product_id)
  return { ok: true, slug: producto?.slug ?? null }
}
