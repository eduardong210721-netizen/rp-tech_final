import Link from 'next/link'
import type { Metadata } from 'next'
import { requireAdmin } from '@/lib/auth'
import { listCategories } from '@/lib/repo/products'
import ProductForm from '../ProductForm'

export const metadata: Metadata = { title: 'Nuevo producto · Panel' }

export default async function NuevoProductoPage() {
  await requireAdmin()
  const categorias = await listCategories()

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/productos"
          className="text-sm text-ink-soft transition-colors duration-(--dur-fast) hover:text-ink"
        >
          ← Productos
        </Link>
        <p className="eyebrow mt-4">Catálogo</p>
        <h1 className="mt-2 text-title">Nuevo producto</h1>
        <p className="mt-3 max-w-2xl text-sm text-ink-soft">
          El SKU y las unidades iniciales solo se escriben ahora: después el SKU queda fijo y el
          stock se ajusta desde{' '}
          <Link
            href="/admin/stock"
            className="text-ink underline underline-offset-4 transition-colors duration-(--dur-fast) hover:text-signal-ink"
          >
            Stock
          </Link>
          .
        </p>
      </div>

      <ProductForm modo="crear" categorias={categorias} />
    </div>
  )
}
