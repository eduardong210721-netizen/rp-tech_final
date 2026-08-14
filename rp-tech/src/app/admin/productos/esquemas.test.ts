import { describe, it, expect } from 'vitest'
import { productUpdateSchema } from './esquemas'

const BASE = {
  nombre: 'Cable Tipo C 60W',
  descripcion_corta: null,
  descripcion_larga: null,
  marca: 'ROMAX',
  modelo: null,
  especificaciones: [{ etiqueta: 'Potencia', valor: '60W' }],
  categoria_id: '00000000-0000-4000-8000-000000000001',
  precio: 12,
  costo: 7, // sintético: los costos reales no viajan en el repositorio
  stock_minimo: 3,
  bajo_pedido: false,
  activo: true,
  garantia_meses: null,
}

describe('productUpdateSchema', () => {
  it('acepta el payload de edición sin sku ni stock', () => {
    const r = productUpdateSchema.safeParse(BASE)
    expect(r.success).toBe(true)
  })

  it('descarta el sku aunque venga en el payload', () => {
    const r = productUpdateSchema.safeParse({ ...BASE, sku: 'SKU-FALSIFICADO' })
    expect(r.success).toBe(true)
    expect(r.success && 'sku' in r.data).toBe(false)
  })

  it('descarta el stock aunque venga en el payload', () => {
    // Este es el defecto que se corrigió: un formulario mandando un stock
    // viejo revivía unidades ya vendidas. Ni llegando a mano puede colarse.
    const r = productUpdateSchema.safeParse({ ...BASE, stock: 9999 })
    expect(r.success).toBe(true)
    expect(r.success && 'stock' in r.data).toBe(false)
  })

  it('sigue validando el resto de los campos', () => {
    expect(productUpdateSchema.safeParse({ ...BASE, precio: -1 }).success).toBe(false)
    expect(productUpdateSchema.safeParse({ ...BASE, nombre: 'ab' }).success).toBe(false)
    expect(productUpdateSchema.safeParse({ ...BASE, categoria_id: 'no-uuid' }).success).toBe(false)
  })
})
