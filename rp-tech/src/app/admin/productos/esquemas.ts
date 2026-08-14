import { z } from 'zod'
import { productFormSchema } from '@/lib/domain/adminProduct'

/**
 * Payload de EDICIÓN: el formulario completo MENOS `sku` y `stock`.
 *
 * Los dos se quitan en el esquema y no solo en la interfaz. Dejarlos como
 * campos deshabilitados en el formulario es una cortesía visual; un `fetch`
 * a mano contra la Server Action los mandaría igual. Al no existir en el
 * esquema, Zod los descarta como claves desconocidas y `actualizarProducto`
 * ni siquiera puede escribirlos por accidente.
 *
 * - `sku`: `order_items` guarda la referencia al producto; renombrar el SKU
 *   rompe el rastro de lo ya vendido. Se corrigió una vez; esto lo cierra.
 * - `stock`: es una columna relativa. Entre que el dueño abre el formulario y
 *   guarda, un pedido puede haber descontado unidades; grabar el número que
 *   leyó al abrir resucita stock ya vendido. El único escritor de esa columna
 *   para un producto existente es la RPC `ajustar_stock` desde /admin/stock.
 */
export const productUpdateSchema = productFormSchema.omit({ sku: true, stock: true })

export type ProductUpdateInput = z.infer<typeof productUpdateSchema>
