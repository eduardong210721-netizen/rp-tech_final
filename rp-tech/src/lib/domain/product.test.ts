import { describe, it, expect } from 'vitest'
import { toPublicProduct, toAdminProduct, type ProductRow, type ImageRow } from './product'

const row: ProductRow = {
  id: 'aaaaaaaa-0000-0000-0000-000000000001',
  sku: '26009',
  slug: 'mouse-gamer-halion-mantis-ha-m105',
  nombre: 'Mouse Gamer Inalámbrico Halion Mantis HA-M105 RGB 10000 DPI',
  descripcion_corta: 'Mouse gamer inalámbrico con RGB y 10000 DPI',
  descripcion_larga: 'Receptor USB 2.4GHz de baja latencia...',
  marca: 'Halion',
  modelo: 'HA-M105',
  especificaciones: [{ etiqueta: 'DPI', valor: '10000' }],
  categoria_id: null,
  conector: 'usb-a',
  compatibilidad_nota:
    'Se conecta a la computadora con el receptor USB que viene incluido.',
  precio: 65,
  // Cifra sintética: el costo real es información competitiva y no viaja
  // en el repositorio. Elegida para que el margen dé un número redondo.
  costo: 39,
  stock: 1,
  stock_minimo: 3,
  bajo_pedido: false,
  activo: true,
  garantia_meses: 6,
  created_at: '2026-08-13T00:00:00Z',
  updated_at: '2026-08-13T00:00:00Z',
}

const imagenes: ImageRow[] = [
  { id: 'i1', product_id: row.id, storage_path: 'productos/26009-1.webp', alt: 'Mouse Halion', orden: 0, es_principal: true },
  { id: 'i2', product_id: row.id, storage_path: 'productos/26009-2.webp', alt: 'Caja',        orden: 1, es_principal: false },
]

describe('toPublicProduct', () => {
  it('NUNCA incluye el costo', () => {
    const p = toPublicProduct(row, imagenes)
    expect(p).not.toHaveProperty('costo')
    expect(JSON.stringify(p)).not.toContain('45')
  })

  it('no incluye stock_minimo ni activo', () => {
    const p = toPublicProduct(row, imagenes)
    expect(p).not.toHaveProperty('stock_minimo')
    expect(p).not.toHaveProperty('activo')
  })

  it('expone los campos de venta', () => {
    const p = toPublicProduct(row, imagenes)
    expect(p.sku).toBe('26009')
    expect(p.precio).toBe(65)
    expect(p.marca).toBe('Halion')
  })

  it('expone el conector y su aviso de compatibilidad', () => {
    // No son datos sensibles: son justo lo que el cliente necesita para saber
    // si el accesorio le sirve. Es la promesa de la tienda.
    const p = toPublicProduct(row, imagenes)
    expect(p.conector).toBe('usb-a')
    expect(p.compatibilidad_nota).toContain('receptor USB')
  })

  it('pone la imagen principal primero', () => {
    const p = toPublicProduct(row, [imagenes[1]!, imagenes[0]!])
    expect(p.imagenes[0]!.storage_path).toBe('productos/26009-1.webp')
  })

  it('marca disponible=true cuando hay stock', () => {
    expect(toPublicProduct(row, imagenes).disponible).toBe(true)
  })

  it('marca disponible=false cuando el stock es 0', () => {
    expect(toPublicProduct({ ...row, stock: 0 }, imagenes).disponible).toBe(false)
  })

  it('marca disponible=true si es bajo pedido aunque el stock sea 0', () => {
    expect(toPublicProduct({ ...row, stock: 0, bajo_pedido: true }, imagenes).disponible).toBe(true)
  })
})

describe('toAdminProduct', () => {
  it('incluye costo, margen y utilidad', () => {
    const p = toAdminProduct(row, imagenes)
    expect(p.costo).toBe(39)
    expect(p.utilidad).toBe(26)
    expect(p.margen).toBeCloseTo(40, 2)
  })

  it('no divide entre cero cuando el precio es 0', () => {
    const p = toAdminProduct({ ...row, precio: 0, costo: 0 }, imagenes)
    expect(p.margen).toBe(0)
  })

  it('avisa cuando el stock está por debajo del mínimo', () => {
    expect(toAdminProduct(row, imagenes).stock_bajo).toBe(true)
    expect(toAdminProduct({ ...row, stock: 10 }, imagenes).stock_bajo).toBe(false)
  })
})
