import { describe, it, expect } from 'vitest'
import {
  esEstadoValido,
  filtrarProductos,
  normalizar,
  ordenarProductos,
  type ProductoFiltrable,
} from './filtrar'

const CABLE: ProductoFiltrable = {
  sku: '26004',
  nombre: 'Cable Apple USB-C a USB-C 240W — 2 m',
  marca: 'Apple',
  categoria_id: 'cat-cables',
  activo: true,
}
const AUDIFONOS: ProductoFiltrable = {
  sku: '26002',
  nombre: 'Audífonos Inalámbricos Damix M20 TWS',
  marca: 'Damix',
  categoria_id: 'cat-audifonos',
  activo: true,
}
const TECLADO: ProductoFiltrable = {
  sku: '26012',
  nombre: 'Teclado Mecánico HyperX RGB TKL',
  marca: null,
  categoria_id: 'cat-computo',
  activo: false,
}
const CATALOGO = [CABLE, AUDIFONOS, TECLADO]

describe('normalizar', () => {
  it('quita tildes y mayúsculas', () => {
    expect(normalizar('Audífonos Inalámbricos')).toBe('audifonos inalambricos')
  })
})

describe('filtrarProductos', () => {
  it('sin filtros devuelve todo', () => {
    expect(filtrarProductos(CATALOGO, {})).toHaveLength(3)
  })

  it('busca sin tildes', () => {
    expect(filtrarProductos(CATALOGO, { q: 'audifonos' })).toEqual([AUDIFONOS])
  })

  it('busca por SKU', () => {
    expect(filtrarProductos(CATALOGO, { q: '26012' })).toEqual([TECLADO])
  })

  it('busca por marca', () => {
    expect(filtrarProductos(CATALOGO, { q: 'apple' })).toEqual([CABLE])
  })

  it('exige todas las palabras del término', () => {
    expect(filtrarProductos(CATALOGO, { q: 'cable usb' })).toEqual([CABLE])
    expect(filtrarProductos(CATALOGO, { q: 'cable teclado' })).toEqual([])
  })

  it('filtra por categoría', () => {
    expect(filtrarProductos(CATALOGO, { categoriaId: 'cat-computo' })).toEqual([TECLADO])
  })

  it('filtra por estado', () => {
    expect(filtrarProductos(CATALOGO, { estado: 'inactivos' })).toEqual([TECLADO])
    expect(filtrarProductos(CATALOGO, { estado: 'activos' })).toEqual([CABLE, AUDIFONOS])
    expect(filtrarProductos(CATALOGO, { estado: 'todos' })).toHaveLength(3)
  })

  it('combina búsqueda, categoría y estado', () => {
    expect(
      filtrarProductos(CATALOGO, { q: 'teclado', categoriaId: 'cat-computo', estado: 'inactivos' }),
    ).toEqual([TECLADO])
    expect(
      filtrarProductos(CATALOGO, { q: 'teclado', categoriaId: 'cat-computo', estado: 'activos' }),
    ).toEqual([])
  })
})

describe('ordenarProductos', () => {
  it('ordena alfabéticamente ignorando tildes', () => {
    expect(ordenarProductos(CATALOGO).map((p) => p.sku)).toEqual(['26002', '26004', '26012'])
  })

  it('no reordena cuando cambia el stock, el precio o el estado', () => {
    const antes = ordenarProductos(CATALOGO).map((p) => p.sku)
    // Misma lista con el producto "editado": otro estado, otra posición de entrada.
    const editado = { ...CABLE, activo: false }
    const despues = ordenarProductos([TECLADO, editado, AUDIFONOS]).map((p) => p.sku)
    expect(despues).toEqual(antes)
  })

  it('no muta el arreglo recibido', () => {
    const original = [...CATALOGO]
    ordenarProductos(CATALOGO)
    expect(CATALOGO).toEqual(original)
  })
})

describe('esEstadoValido', () => {
  it('acepta solo los tres estados conocidos', () => {
    expect(esEstadoValido('activos')).toBe(true)
    expect(esEstadoValido('inactivos')).toBe(true)
    expect(esEstadoValido('todos')).toBe(true)
    expect(esEstadoValido('borrados')).toBe(false)
    expect(esEstadoValido(undefined)).toBe(false)
  })
})
