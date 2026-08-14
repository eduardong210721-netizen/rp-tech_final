import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { requireAdmin } from '@/lib/auth'
import { getAdminProductById, listCategories } from '@/lib/repo/products'
import { listImagenesDeProducto } from '@/lib/repo/imagenes'
import ProductForm from '../ProductForm'
import GaleriaImagenes from '../GaleriaImagenes'

export const metadata: Metadata = { title: 'Editar producto · Panel' }

export default async function EditarProductoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireAdmin()
  const { id } = await params

  const [categorias, producto] = await Promise.all([listCategories(), getAdminProductById(id)])

  if (!producto) notFound()

  // Las imágenes se leen con su id, su orden y su marca de principal —lo que
  // la galería necesita para reordenar—. AdminProduct solo trae la forma
  // pública (storage_path y alt), que no basta aquí.
  const imagenes = await listImagenesDeProducto(producto.id)

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/productos"
          className="text-sm text-ink-soft transition-colors duration-(--dur-fast) hover:text-ink"
        >
          ← Productos
        </Link>

        <div className="mt-4 flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
          <div className="min-w-0">
            <p className="eyebrow">
              Editar · SKU <span className="text-ink-soft">{producto.sku}</span>
            </p>
            <h1 className="mt-2 text-title">{producto.nombre}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {producto.activo ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-ok/10 px-3 py-1.5 text-xs font-medium text-ok">
                <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-ok" />
                Publicado
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-paper-alt px-3 py-1.5 text-xs text-ink-muted">
                <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-ink-muted" />
                Sin publicar
              </span>
            )}
            {producto.activo && (
              <Link
                href={`/producto/${producto.slug}`}
                className="rounded-full border border-hairline px-4 py-1.5 text-xs text-ink transition-colors duration-(--dur-fast) hover:border-ink"
              >
                Ver en la tienda
              </Link>
            )}
          </div>
        </div>
      </div>

      <GaleriaImagenes
        productId={producto.id}
        imagenes={imagenes.map((i) => ({
          id: i.id,
          storage_path: i.storage_path,
          alt: i.alt,
          es_principal: i.es_principal,
        }))}
      />

      <ProductForm modo="editar" categorias={categorias} producto={producto} />
    </div>
  )
}
