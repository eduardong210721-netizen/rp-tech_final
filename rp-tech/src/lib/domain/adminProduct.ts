import { z } from 'zod'

/**
 * Genera el slug de la URL a partir del nombre.
 * NFD + strip de marcas diacríticas quita las tildes sin tabla de reemplazo.
 */
export function slugify(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')   // marcas diacríticas (tildes)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

const especificacionSchema = z.object({
  etiqueta: z.string().trim().min(1).max(60),
  valor: z.string().trim().min(1).max(200),
})

export const productFormSchema = z.object({
  sku: z.string().trim().min(1, 'El SKU es obligatorio').max(32),
  nombre: z.string().trim().min(3, 'El nombre es obligatorio').max(200),
  descripcion_corta: z.string().trim().max(200).optional().nullable(),
  descripcion_larga: z.string().trim().max(4000).optional().nullable(),
  marca: z.string().trim().max(60).optional().nullable(),
  modelo: z.string().trim().max(60).optional().nullable(),
  especificaciones: z.array(especificacionSchema).max(30).default([]),
  categoria_id: z.string().uuid('Elige una categoría'),
  precio: z.number().nonnegative('El precio no puede ser negativo'),
  costo: z.number().nonnegative('El costo no puede ser negativo'),
  stock: z.number().int('El stock debe ser un número entero').nonnegative('El stock no puede ser negativo'),
  stock_minimo: z.number().int().nonnegative().default(3),
  bajo_pedido: z.boolean().default(false),
  activo: z.boolean().default(true),
  garantia_meses: z.number().int().nonnegative().max(120).optional().nullable(),
})

export type ProductFormInput = z.infer<typeof productFormSchema>
