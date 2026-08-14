import { describe, it, expect } from 'vitest'
import { addLine, setQty, removeLine, cartTotal, type CartLine } from './cart'

const mouse: CartLine = { sku: '26009', slug: 'mouse', nombre: 'Mouse', precio: 65, imagen: null, cantidad: 1, maximo: 1 }
const cable: CartLine = { sku: '26004', slug: 'cable', nombre: 'Cable', precio: 15, imagen: null, cantidad: 2, maximo: 6 }

describe('addLine', () => {
  it('agrega una línea nueva', () => {
    expect(addLine([], mouse)).toHaveLength(1)
  })

  it('suma cantidades si el SKU ya está', () => {
    const r = addLine([cable], { ...cable, cantidad: 3 })
    expect(r).toHaveLength(1)
    expect(r[0]!.cantidad).toBe(5)
  })

  it('nunca supera el máximo disponible', () => {
    const r = addLine([mouse], { ...mouse, cantidad: 5 })
    expect(r[0]!.cantidad).toBe(1)
  })

  it('permite pasar del máximo si es bajo pedido (maximo null)', () => {
    const bajoPedido = { ...mouse, maximo: null }
    const r = addLine([bajoPedido], { ...bajoPedido, cantidad: 99 })
    expect(r[0]!.cantidad).toBe(100)
  })
})

describe('setQty', () => {
  it('cambia la cantidad', () => {
    expect(setQty([cable], '26004', 4)[0]!.cantidad).toBe(4)
  })

  it('elimina la línea si la cantidad baja a 0', () => {
    expect(setQty([cable], '26004', 0)).toHaveLength(0)
  })

  it('recorta al máximo', () => {
    expect(setQty([cable], '26004', 99)[0]!.cantidad).toBe(6)
  })
})

describe('removeLine', () => {
  it('quita solo el SKU indicado', () => {
    const r = removeLine([mouse, cable], '26009')
    expect(r).toHaveLength(1)
    expect(r[0]!.sku).toBe('26004')
  })
})

describe('cartTotal', () => {
  it('suma precio por cantidad', () => {
    expect(cartTotal([mouse, cable])).toBe(95)   // 65*1 + 15*2
  })

  it('devuelve 0 con carrito vacío', () => {
    expect(cartTotal([])).toBe(0)
  })
})
