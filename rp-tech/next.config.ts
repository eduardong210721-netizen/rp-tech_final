import type { NextConfig } from 'next'

/**
 * Host de Supabase Storage, autorizado para `next/image`.
 *
 * Se resuelve EN TIEMPO DE CONSTRUCCIÓN, así que la variable tiene que estar
 * presente cuando Vercel construye, no solo cuando el sitio corre.
 *
 * Antes, si faltaba, `remotePatterns` quedaba en `[]` y el resultado era un
 * sitio que compilaba sin una sola queja y servía TODAS las fotos de producto
 * rotas. Un despliegue que falla es un problema de diez minutos; un despliegue
 * que parece correcto y muestra el catálogo sin imágenes es un problema que se
 * descubre por un cliente.
 */
function hostDeSupabase(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()

  if (!url) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'Falta NEXT_PUBLIC_SUPABASE_URL al construir. Sin ella, next/image no ' +
          'autoriza el host de Storage y todas las fotos del catálogo quedan rotas. ' +
          'Defínela en las variables de entorno del proyecto en Vercel.',
      )
    }
    // En desarrollo se avisa y se sigue: puede que alguien solo esté
    // levantando la app para tocar estilos.
    console.warn(
      '[next.config] NEXT_PUBLIC_SUPABASE_URL no está definida: las imágenes ' +
        'de producto no cargarán.',
    )
    return ''
  }

  try {
    return new URL(url).hostname
  } catch {
    throw new Error(
      `NEXT_PUBLIC_SUPABASE_URL no es una URL válida: ${JSON.stringify(url)}`,
    )
  }
}

const host = hostDeSupabase()

const nextConfig: NextConfig = {
  images: {
    remotePatterns: host
      ? [
          {
            protocol: 'https',
            hostname: host,
            pathname: '/storage/v1/object/public/**',
          },
        ]
      : [],
  },
}

export default nextConfig
