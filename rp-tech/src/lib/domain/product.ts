export type Especificacion = { etiqueta: string; valor: string }

export type ImageRow = {
  id: string
  product_id: string
  storage_path: string
  alt: string
  orden: number
  es_principal: boolean
}

/** Fila cruda de public.products. Contiene `costo`: nunca la mandes a la UI pública. */
export type ProductRow = {
  id: string
  sku: string
  slug: string
  nombre: string
  descripcion_corta: string | null
  descripcion_larga: string | null
  marca: string | null
  modelo: string | null
  especificaciones: Especificacion[]
  categoria_id: string | null
  /** Conector que se enchufa al equipo del cliente. Ver @/lib/domain/conector */
  conector: string | null
  /** Aviso en prosa cuando el nombre puede inducir a error de compatibilidad */
  compatibilidad_nota: string | null
  precio: number
  costo: number
  stock: number
  stock_minimo: number
  bajo_pedido: boolean
  activo: boolean
  garantia_meses: number | null
  created_at: string
  updated_at: string
}

export type PublicImage = { storage_path: string; alt: string }

export type PublicProduct = {
  id: string
  sku: string
  slug: string
  nombre: string
  descripcion_corta: string | null
  descripcion_larga: string | null
  marca: string | null
  modelo: string | null
  especificaciones: Especificacion[]
  categoria_id: string | null
  conector: string | null
  compatibilidad_nota: string | null
  precio: number
  garantia_meses: number | null
  imagenes: PublicImage[]
  /** true si se puede añadir al carrito */
  disponible: boolean
  /** unidades restantes; null cuando es bajo pedido */
  stock_restante: number | null
}

export type AdminProduct = PublicProduct & {
  costo: number
  stock: number
  stock_minimo: number
  bajo_pedido: boolean
  activo: boolean
  /** precio - costo */
  utilidad: number
  /** porcentaje de margen sobre el precio */
  margen: number
  stock_bajo: boolean
  created_at: string
  updated_at: string
}

function ordenarImagenes(imagenes: ImageRow[]): PublicImage[] {
  return [...imagenes]
    .sort((a, b) => {
      if (a.es_principal !== b.es_principal) return a.es_principal ? -1 : 1
      return a.orden - b.orden
    })
    .map((i) => ({ storage_path: i.storage_path, alt: i.alt }))
}

/**
 * Convierte una fila a su forma pública. Construye el objeto campo por campo
 * a propósito: si mañana se agrega una columna sensible a `products`, NO se
 * filtra sola. Nunca reescribas esto como `const { costo, ...resto } = row`.
 */
export function toPublicProduct(row: ProductRow, imagenes: ImageRow[]): PublicProduct {
  return {
    id: row.id,
    sku: row.sku,
    slug: row.slug,
    nombre: row.nombre,
    descripcion_corta: row.descripcion_corta,
    descripcion_larga: row.descripcion_larga,
    marca: row.marca,
    modelo: row.modelo,
    especificaciones: row.especificaciones,
    categoria_id: row.categoria_id,
    conector: row.conector,
    compatibilidad_nota: row.compatibilidad_nota,
    precio: row.precio,
    garantia_meses: row.garantia_meses,
    imagenes: ordenarImagenes(imagenes),
    disponible: row.bajo_pedido || row.stock > 0,
    stock_restante: row.bajo_pedido ? null : row.stock,
  }
}

export function toAdminProduct(row: ProductRow, imagenes: ImageRow[]): AdminProduct {
  const utilidad = row.precio - row.costo
  return {
    ...toPublicProduct(row, imagenes),
    costo: row.costo,
    stock: row.stock,
    stock_minimo: row.stock_minimo,
    bajo_pedido: row.bajo_pedido,
    activo: row.activo,
    utilidad,
    margen: row.precio > 0 ? (utilidad / row.precio) * 100 : 0,
    stock_bajo: !row.bajo_pedido && row.stock <= row.stock_minimo,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}
