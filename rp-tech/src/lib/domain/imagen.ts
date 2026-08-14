/**
 * Reglas puras de la subida de imágenes de producto.
 *
 * Vive fuera de la Server Action a propósito: son las decisiones que hay que
 * poder probar sin red, sin Supabase y sin navegador. La action solo orquesta.
 *
 * Nada de lo que dice el cliente se cree: el tipo declarado en el `File` y el
 * nombre del archivo llegan del navegador y un usuario autenticado puede
 * mandar lo que quiera. El tipo real se decide leyendo los primeros bytes.
 */

/** Los tres mime que acepta el bucket "productos". */
export const TIPOS_PERMITIDOS = ['image/webp', 'image/jpeg', 'image/png'] as const
export type TipoImagen = (typeof TIPOS_PERMITIDOS)[number]

/**
 * Tope de bytes por archivo.
 *
 * El bucket acepta 2 MB, pero el cuerpo de una Server Action de Next.js está
 * cortado en 1 MB (`serverActions.bodySizeLimit`, valor por defecto). Un
 * archivo de entre 1 y 2 MB ni siquiera llegaría a esta validación: lo rechaza
 * el framework con un error suyo, no con un mensaje nuestro. Así que el tope
 * efectivo —y el único que se le promete al dueño— es 1 MB.
 *
 * En la práctica no aprieta: el navegador reencoda a WebP de 1600 px antes de
 * enviar, así que una foto de celular de 5 MB llega en ~200 KB. Subirlo a los
 * 2 MB del bucket exige tocar next.config.ts, que no es de este encargo.
 */
export const MAX_BYTES = 1_000_000

export const ALT_MIN = 3
export const ALT_MAX = 160

/** Tope de fotos por producto. Ni el bucket ni la ficha ganan nada con más. */
export const MAX_IMAGENES = 8

/** Extensión con la que se guarda cada tipo. La del cliente nunca se reutiliza. */
const EXTENSION_DE: Record<TipoImagen, string> = {
  'image/webp': 'webp',
  'image/jpeg': 'jpg',
  'image/png': 'png',
}

/** Extensiones aceptadas en el nombre entrante, y el tipo real que deben tener. */
const TIPO_DE_EXTENSION: Record<string, TipoImagen> = {
  webp: 'image/webp',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
}

export function extensionDe(tipo: TipoImagen): string {
  return EXTENSION_DE[tipo]
}

/** Compara `bytes` con una firma a partir de `desde`, sin salirse del buffer. */
function coincideFirma(bytes: Uint8Array, desde: number, firma: readonly number[]): boolean {
  if (bytes.length < desde + firma.length) return false
  for (let i = 0; i < firma.length; i++) {
    if (bytes[desde + i] !== firma[i]) return false
  }
  return true
}

const FIRMA_PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] as const
const FIRMA_JPEG = [0xff, 0xd8, 0xff] as const
const FIRMA_RIFF = [0x52, 0x49, 0x46, 0x46] as const // "RIFF" en el offset 0
const FIRMA_WEBP = [0x57, 0x45, 0x42, 0x50] as const // "WEBP" en el offset 8

/**
 * Tipo REAL del archivo, leído de sus primeros bytes. Es lo único que decide
 * qué se guarda: un script renombrado a .png no tiene estas firmas y cae aquí.
 */
export function detectarTipoReal(bytes: Uint8Array): TipoImagen | null {
  if (coincideFirma(bytes, 0, FIRMA_PNG)) return 'image/png'
  if (coincideFirma(bytes, 0, FIRMA_JPEG)) return 'image/jpeg'
  if (coincideFirma(bytes, 0, FIRMA_RIFF) && coincideFirma(bytes, 8, FIRMA_WEBP)) return 'image/webp'
  return null
}

/** Extensión en minúsculas del nombre entrante, o null si no tiene una usable. */
function extensionDelNombre(nombre: string): string | null {
  const punto = nombre.lastIndexOf('.')
  if (punto <= 0 || punto === nombre.length - 1) return null
  return nombre.slice(punto + 1).toLowerCase()
}

function formatearPeso(bytes: number): string {
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`
  return `${Math.max(1, Math.round(bytes / 1000))} KB`
}

export type ValidacionArchivo =
  | { ok: true; tipo: TipoImagen; extension: string }
  | { ok: false; error: string }

/**
 * Valida tamaño, extensión declarada y tipo real, y exige que los dos últimos
 * concuerden. El orden importa: primero lo barato, al final lo que obliga a
 * mirar el contenido.
 */
export function validarArchivoImagen(entrada: {
  nombre: string
  tamano: number
  bytes: Uint8Array
}): ValidacionArchivo {
  const { nombre, tamano, bytes } = entrada

  if (tamano <= 0 || bytes.length === 0) {
    return { ok: false, error: 'El archivo está vacío.' }
  }
  if (tamano > MAX_BYTES || bytes.length > MAX_BYTES) {
    const peso = formatearPeso(Math.max(tamano, bytes.length))
    return { ok: false, error: `La imagen pesa ${peso} y el máximo es ${formatearPeso(MAX_BYTES)}.` }
  }

  const extension = extensionDelNombre(nombre)
  const tipoSegunExtension = extension ? TIPO_DE_EXTENSION[extension] : undefined
  if (!extension || !tipoSegunExtension) {
    return { ok: false, error: 'Usa un archivo .webp, .jpg o .png.' }
  }

  const tipoReal = detectarTipoReal(bytes)
  if (!tipoReal) {
    return { ok: false, error: 'El archivo no es una imagen WebP, JPEG ni PNG.' }
  }
  if (tipoReal !== tipoSegunExtension) {
    return {
      ok: false,
      error: `El archivo dice ser .${extension} pero su contenido es ${tipoReal}.`,
    }
  }

  return { ok: true, tipo: tipoReal, extension: extensionDe(tipoReal) }
}

/**
 * Nombre del objeto DENTRO del bucket. Sin "productos/" delante: `.from('productos')`
 * ya fija el bucket, y prefijarlo anida los objetos en productos/productos/ y deja
 * todas las URL en 400. Ya pasó una vez.
 *
 * El SKU es texto del dueño, así que se normaliza a [a-z0-9-] antes de entrar:
 * ni barras ni ".." pueden escribir fuera del bucket, y el `storage_path` que
 * queda en la fila es seguro de interpolar en una URL —acaba en el JSON-LD de
 * la ficha pública a través de imageUrl()—.
 *
 * El sufijo aleatorio es lo que impide que la segunda foto de un producto pise
 * a la primera: dos subidas del mismo SKU nunca comparten nombre.
 */
export function nombreObjetoSeguro(sku: string, tipo: TipoImagen, sufijo: string): string {
  if (!/^[a-f0-9]{6,32}$/.test(sufijo)) {
    throw new Error('Sufijo de nombre inválido: se esperaba hexadecimal de 6 a 32 caracteres.')
  }

  const base =
    sku
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '') // marcas diacríticas (tildes)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .slice(0, 32)
      .replace(/^-+|-+$/g, '') || 'producto'

  return `${base}-${sufijo}.${extensionDe(tipo)}`
}

/**
 * Última reja antes de borrar un objeto de Storage. El `storage_path` viene de
 * la base, pero se comprueba igual: un valor con "/" o ".." convertiría el
 * borrado de una foto en el borrado de cualquier otra ruta del bucket.
 */
export function esRutaDeObjetoSegura(ruta: string): boolean {
  return /^[a-z0-9][a-z0-9._-]*\.(webp|jpe?g|png)$/i.test(ruta) && !ruta.includes('..')
}

export type ValidacionAlt = { ok: true; alt: string } | { ok: false; error: string }

/**
 * El alt es obligatorio: sin él la ficha, la tarjeta y el lector de pantalla se
 * quedan sin decir qué se ve.
 *
 * Es texto del dueño y termina renderizado en el atributo `alt` de la ficha y
 * en `og:image:alt`. React escapa atributos y /producto/[slug] ya escapa su
 * bloque JSON-LD, pero aquí se le quitan igual los caracteres de control y los
 * signos de menor/mayor —una foto de producto no los necesita— para que no
 * pueda componer marcado en ningún destino presente ni futuro.
 */
export function validarAlt(entrada: unknown): ValidacionAlt {
  if (typeof entrada !== 'string') {
    return { ok: false, error: 'Describe la foto en el campo de texto alternativo.' }
  }

  // Los caracteres de control se convierten en espacio (no se borran) para que
  // "linea1\nlinea2" no acabe pegado como "linea1linea2".
  const sinControl = Array.from(entrada)
    .map((c) => {
      const cp = c.codePointAt(0) ?? 0
      return cp < 0x20 || cp === 0x7f ? ' ' : c
    })
    .join('')

  const limpio = sinControl
    .replace(/[<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

  if (limpio.length < ALT_MIN) {
    return { ok: false, error: 'Describe la foto: el texto alternativo es obligatorio.' }
  }
  if (limpio.length > ALT_MAX) {
    return { ok: false, error: `El texto alternativo no puede pasar de ${ALT_MAX} caracteres.` }
  }
  return { ok: true, alt: limpio }
}
