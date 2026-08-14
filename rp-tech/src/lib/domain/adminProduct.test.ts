import { describe, it, expect } from 'vitest'
import { productFormSchema, slugify } from './adminProduct'

const base = {
  sku: '26013', nombre: 'Producto Nuevo', precio: 25, costo: 10,
  stock: 5, stock_minimo: 3, categoria_id: 'c0000000-0000-4000-8000-000000000001',
  activo: true, bajo_pedido: false,
}

describe('slugify', () => {
  it('convierte a minúsculas con guiones', () => {
    expect(slugify('Mouse Gamer Halion')).toBe('mouse-gamer-halion')
  })
  it('quita tildes', () => {
    expect(slugify('Audífonos Estéreo')).toBe('audifonos-estereo')
  })
  it('quita caracteres raros', () => {
    expect(slugify('Cable 7.2A / 75W')).toBe('cable-7-2a-75w')
  })
  it('no deja guiones al inicio ni al final', () => {
    expect(slugify('  Hola  ')).toBe('hola')
  })
})

describe('productFormSchema', () => {
  it('acepta un producto válido', () => {
    expect(productFormSchema.safeParse(base).success).toBe(true)
  })
  it('rechaza precio negativo', () => {
    expect(productFormSchema.safeParse({ ...base, precio: -1 }).success).toBe(false)
  })
  it('rechaza stock negativo', () => {
    expect(productFormSchema.safeParse({ ...base, stock: -3 }).success).toBe(false)
  })
  it('rechaza stock decimal', () => {
    expect(productFormSchema.safeParse({ ...base, stock: 2.5 }).success).toBe(false)
  })
  it('rechaza SKU vacío', () => {
    expect(productFormSchema.safeParse({ ...base, sku: '' }).success).toBe(false)
  })
  it('acepta costo mayor al precio pero lo marca', () => {
    const r = productFormSchema.safeParse({ ...base, costo: 50, precio: 25 })
    expect(r.success).toBe(true)   // se permite; el UI muestra una advertencia de margen negativo
  })
})
