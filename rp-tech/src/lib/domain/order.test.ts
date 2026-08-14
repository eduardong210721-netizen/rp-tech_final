import { describe, it, expect } from 'vitest'
import { checkoutSchema, cartItemSchema, mensajeDeError } from './order'

const valido = {
  cliente_nombre: 'Ana Torres',
  cliente_telefono: '987654321',
  distrito: 'Miraflores',
  referencia: 'Casa blanca, portón negro',
  items: [{ sku: '26002', cantidad: 2 }],
}

describe('cartItemSchema', () => {
  it('rechaza cantidad cero', () => {
    expect(cartItemSchema.safeParse({ sku: '26002', cantidad: 0 }).success).toBe(false)
  })

  it('rechaza cantidad negativa', () => {
    expect(cartItemSchema.safeParse({ sku: '26002', cantidad: -5 }).success).toBe(false)
  })

  it('rechaza cantidad decimal', () => {
    expect(cartItemSchema.safeParse({ sku: '26002', cantidad: 1.5 }).success).toBe(false)
  })

  it('rechaza cantidad absurda', () => {
    expect(cartItemSchema.safeParse({ sku: '26002', cantidad: 10000 }).success).toBe(false)
  })

  it('ignora cualquier precio que mande el cliente', () => {
    const r = cartItemSchema.parse({ sku: '26002', cantidad: 1, precio: 0.01 })
    expect(r).not.toHaveProperty('precio')
  })
})

describe('checkoutSchema', () => {
  it('acepta un pedido válido', () => {
    expect(checkoutSchema.safeParse(valido).success).toBe(true)
  })

  it('rechaza carrito vacío', () => {
    expect(checkoutSchema.safeParse({ ...valido, items: [] }).success).toBe(false)
  })

  it('rechaza nombre vacío', () => {
    expect(checkoutSchema.safeParse({ ...valido, cliente_nombre: '  ' }).success).toBe(false)
  })

  it('rechaza teléfono que no sea 9 dígitos peruanos', () => {
    expect(checkoutSchema.safeParse({ ...valido, cliente_telefono: '12345' }).success).toBe(false)
    expect(checkoutSchema.safeParse({ ...valido, cliente_telefono: '123456789' }).success).toBe(false)
  })

  it('acepta teléfono con espacios y los limpia', () => {
    const r = checkoutSchema.parse({ ...valido, cliente_telefono: '987 654 321' })
    expect(r.cliente_telefono).toBe('987654321')
  })

  it('recorta espacios del nombre', () => {
    const r = checkoutSchema.parse({ ...valido, cliente_nombre: '  Ana Torres  ' })
    expect(r.cliente_nombre).toBe('Ana Torres')
  })

  it('rechaza SKU duplicado en el mismo pedido', () => {
    const r = checkoutSchema.safeParse({
      ...valido,
      items: [{ sku: '26002', cantidad: 1 }, { sku: '26002', cantidad: 3 }],
    })
    expect(r.success).toBe(false)
  })
})

describe('mensajeDeError', () => {
  it('explica el agotado cuando quedan 0', () => {
    const m = mensajeDeError('STOCK_INSUFICIENTE:26009:0')
    expect(m).toContain('26009')
    expect(m).toContain('agotó')
  })

  it('dice cuántas unidades quedan', () => {
    const m = mensajeDeError('STOCK_INSUFICIENTE:26004:3')
    expect(m).toContain('3 unidades')
  })

  it('funciona con el prefijo que antepone Postgres', () => {
    const m = mensajeDeError('P0001: STOCK_INSUFICIENTE:26009:0')
    expect(m).toContain('26009')
  })

  it('traduce producto no disponible', () => {
    expect(mensajeDeError('PRODUCTO_NO_DISPONIBLE:26011')).toContain('26011')
  })

  it('traduce pedido vacío', () => {
    expect(mensajeDeError('PEDIDO_VACIO')).toBe('Tu carrito está vacío.')
  })

  it('no filtra detalles internos ante un error desconocido', () => {
    const m = mensajeDeError('duplicate key value violates unique constraint "orders_pkey"')
    expect(m).not.toContain('orders_pkey')
    expect(m).toContain('Intenta de nuevo')
  })
})
