/**
 * URL pública canónica del sitio: único punto de verdad. layout.tsx
 * (`metadataBase`, OpenGraph), robots.ts y sitemap.ts importan esto en vez
 * de leer `NEXT_PUBLIC_SITE_URL` cada uno con su propio fallback.
 *
 * Antes robots.ts y sitemap.ts caían a 'https://rptech.pe' y layout.tsx caía
 * a 'http://localhost:3000': si la variable faltaba en producción, el
 * sitemap anunciaba una URL y las etiquetas <link canonical>/og:url otra --
 * las vistas previas de WhatsApp, el único canal de distribución de la
 * tienda, se rompían en silencio, sin ningún aviso.
 *
 * En producción la variable faltante es un error de despliegue: se lanza al
 * importar este módulo (falla rápido, no en cada request con una URL
 * incorrecta ya servida). En desarrollo se usa localhost y se avisa por
 * consola una sola vez -nunca en cada import, gracias al caché de módulos de
 * Node-.
 */
const FALLBACK_DESARROLLO = 'http://localhost:3000'

function resolverSiteUrl(): string {
  const valor = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  if (valor) return valor.replace(/\/+$/, '')

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'Falta NEXT_PUBLIC_SITE_URL en producción: el sitemap, robots.txt y las ' +
        'URLs canónicas/OpenGraph no pueden construirse sin ella.',
    )
  }

  console.warn(
    `[siteUrl] NEXT_PUBLIC_SITE_URL no está definida; usando ${FALLBACK_DESARROLLO} ` +
      'solo porque NODE_ENV no es "production". Nunca despliegues así.',
  )
  return FALLBACK_DESARROLLO
}

export const SITE_URL = resolverSiteUrl()
