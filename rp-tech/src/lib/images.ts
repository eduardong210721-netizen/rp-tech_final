const BASE = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/productos/`

/** Convierte 'productos/26009.webp' en su URL pública de Storage. */
export function imageUrl(storagePath: string): string {
  return BASE + storagePath.replace(/^productos\//, '')
}

export const IMAGEN_PLACEHOLDER = '/placeholder.svg'
