import { MAX_BYTES } from '@/lib/domain/imagen'

/**
 * Reencoda en el NAVEGADOR la foto elegida antes de mandarla.
 *
 * No es una validación —eso pasa entero en el servidor, sobre los bytes que
 * llegan— sino la misma pasada que hace scripts/optimizar-imagenes.sh con las
 * fotos sembradas: 1600 px de lado mayor y WebP de calidad 0.82. Una foto de
 * celular de 5 MB sale en ~200 KB.
 *
 * Importa porque el cuerpo de una Server Action está cortado en 1 MB: sin este
 * paso, la mitad de las fotos reales del dueño no cabrían.
 */

export const LADO_MAX = 1600
export const CALIDAD = 0.82

export type FotoPreparada = {
  archivo: File
  bytesOriginal: number
  /** true si el navegador no pudo reencodar y se manda el archivo tal cual. */
  sinConvertir: boolean
}

function nombreWebp(original: string): string {
  const punto = original.lastIndexOf('.')
  const base = punto > 0 ? original.slice(0, punto) : original
  return `${base || 'foto'}.webp`
}

function medidas(ancho: number, alto: number): { ancho: number; alto: number } {
  const mayor = Math.max(ancho, alto)
  if (mayor <= LADO_MAX) return { ancho, alto }
  const factor = LADO_MAX / mayor
  return { ancho: Math.round(ancho * factor), alto: Math.round(alto * factor) }
}

async function aWebp(original: File): Promise<File | null> {
  if (typeof createImageBitmap !== 'function') return null

  let bitmap: ImageBitmap
  try {
    // `imageOrientation` respeta el EXIF: sin esto, una foto tomada en
    // vertical con el celular se sube acostada.
    bitmap = await createImageBitmap(original, { imageOrientation: 'from-image' })
  } catch {
    return null // formato que el navegador no sabe decodificar (HEIC, por ejemplo)
  }

  try {
    const { ancho, alto } = medidas(bitmap.width, bitmap.height)
    const lienzo = document.createElement('canvas')
    lienzo.width = ancho
    lienzo.height = alto

    const ctx = lienzo.getContext('2d')
    if (!ctx) return null
    ctx.drawImage(bitmap, 0, 0, ancho, alto)

    const blob = await new Promise<Blob | null>((resolve) => {
      lienzo.toBlob(resolve, 'image/webp', CALIDAD)
    })
    // Un navegador sin encoder WebP devuelve PNG en silencio: si no salió
    // WebP, se descarta la conversión y se manda el original.
    if (!blob || blob.type !== 'image/webp') return null

    return new File([blob], nombreWebp(original.name), { type: 'image/webp' })
  } finally {
    bitmap.close()
  }
}

export type ResultadoPreparacion =
  | { ok: true; foto: FotoPreparada }
  | { ok: false; error: string }

export async function prepararImagen(original: File): Promise<ResultadoPreparacion> {
  const convertida = await aWebp(original)
  const archivo = convertida ?? original
  const sinConvertir = convertida === null

  if (archivo.size > MAX_BYTES) {
    const peso = (archivo.size / 1_000_000).toFixed(1)
    return {
      ok: false,
      error: sinConvertir
        ? `No se pudo optimizar esta imagen y pesa ${peso} MB. Guárdala como WebP, JPG o PNG de menos de 1 MB y vuelve a intentarlo.`
        : `Aun optimizada la imagen pesa ${peso} MB, por encima del máximo de 1 MB.`,
    }
  }

  return { ok: true, foto: { archivo, bytesOriginal: original.size, sinConvertir } }
}

/** "184 KB" / "2.4 MB", para poder decirle al dueño cuánto se ahorró. */
export function pesoLegible(bytes: number): string {
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`
  return `${Math.max(1, Math.round(bytes / 1000))} KB`
}
