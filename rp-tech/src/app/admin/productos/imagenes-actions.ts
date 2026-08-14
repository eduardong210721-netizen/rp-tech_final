'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth'
import { MAX_BYTES } from '@/lib/domain/imagen'
import {
  subirImagenCore,
  eliminarImagenCore,
  marcarPrincipalCore,
  moverImagenCore,
  guardarAltCore,
  type ResultadoCore,
} from './imagenes-core'

/**
 * Cáscara de las acciones de imágenes. Cada una hace tres cosas y nada más:
 * comprobar que quien llama es admin, traducir la entrada del navegador y
 * revalidar las rutas afectadas. La lógica está en imagenes-core.ts.
 *
 * `requireAdmin()` es la primera línea de todas, sin excepción: una Server
 * Action es un endpoint POST público: que el formulario solo se pinte dentro
 * del panel no impide a nadie llamarla directamente.
 */

export type ResultadoImagen = { ok: true } | { ok: false; error: string }

/**
 * Invalida todo lo que muestra la foto: catálogo, panel y ficha pública. La
 * ficha se revalida por slug porque /producto/[slug] tiene `revalidate = 60`
 * y sin esto seguiría sirviendo su versión cacheada con la imagen vieja.
 */
function aplicar(resultado: ResultadoCore): ResultadoImagen {
  if (!resultado.ok) return resultado

  revalidatePath('/')
  revalidatePath('/admin')
  if (resultado.slug) revalidatePath(`/producto/${resultado.slug}`)
  return { ok: true }
}

/**
 * Sube una foto y la enlaza al producto.
 *
 * Todo lo que decide el resultado se comprueba en el SERVIDOR sobre los bytes
 * que llegaron: el tipo que declara el navegador no se mira ni una vez.
 */
export async function subirImagen(
  productId: string,
  formData: FormData,
): Promise<ResultadoImagen> {
  await requireAdmin()

  const archivo = formData.get('archivo')
  if (!(archivo instanceof File)) return { ok: false, error: 'Elige una imagen.' }

  // El tamaño se mira antes de materializar los bytes en memoria. El cuerpo de
  // la Server Action ya está limitado a 1 MB por Next; esto es el segundo
  // cinturón, y el core vuelve a medir lo que de verdad llegó.
  if (archivo.size > MAX_BYTES) {
    return { ok: false, error: `La imagen no puede pasar de ${MAX_BYTES / 1000} KB.` }
  }

  return aplicar(
    await subirImagenCore(productId, {
      nombreArchivo: archivo.name,
      tamano: archivo.size,
      bytes: new Uint8Array(await archivo.arrayBuffer()),
      alt: formData.get('alt'),
    }),
  )
}

/** Borra la foto y su objeto de Storage; si era la principal, asciende la siguiente. */
export async function eliminarImagen(imagenId: string): Promise<ResultadoImagen> {
  await requireAdmin()
  return aplicar(await eliminarImagenCore(imagenId))
}

export async function marcarPrincipal(imagenId: string): Promise<ResultadoImagen> {
  await requireAdmin()
  return aplicar(await marcarPrincipalCore(imagenId))
}

export async function moverImagen(
  imagenId: string,
  direccion: 'arriba' | 'abajo',
): Promise<ResultadoImagen> {
  await requireAdmin()
  return aplicar(await moverImagenCore(imagenId, direccion))
}

/** Corrige el texto alternativo sin tener que borrar y volver a subir la foto. */
export async function guardarAlt(imagenId: string, alt: unknown): Promise<ResultadoImagen> {
  await requireAdmin()
  return aplicar(await guardarAltCore(imagenId, alt))
}
