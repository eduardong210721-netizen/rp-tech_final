import type { MetadataRoute } from 'next'
import { SITE_URL as BASE } from '@/lib/siteUrl'

// /admin/: panel de gestión, ya protegido por auth pero no debe indexarse.
// /checkout: formulario de compra, no aporta valor en buscadores.
// /pedido/: cada URL contiene el pedido de un cliente (código adivinable);
// nunca debe quedar indexada ni cacheada por un buscador.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/checkout', '/pedido/'],
    },
    sitemap: `${BASE}/sitemap.xml`,
  }
}
