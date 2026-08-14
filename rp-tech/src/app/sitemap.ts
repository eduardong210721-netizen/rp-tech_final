import type { MetadataRoute } from 'next'
import { listAllPublicSlugs } from '@/lib/repo/products'
import { SITE_URL as BASE } from '@/lib/siteUrl'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const slugs = await listAllPublicSlugs()
  return [
    { url: BASE, changeFrequency: 'daily', priority: 1 },
    ...slugs.map((slug) => ({
      url: `${BASE}/producto/${slug}`,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
  ]
}
