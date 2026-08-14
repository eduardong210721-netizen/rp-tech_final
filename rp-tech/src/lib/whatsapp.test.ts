import { describe, it, expect } from 'vitest'
import { buildWhatsAppMessage, whatsappUrl } from './whatsapp'

const pedido = {
  codigo: 'RP-2026-0007',
  cliente_nombre: 'Ana Torres',
  cliente_telefono: '987654321',
  distrito: 'Miraflores',
  referencia: 'Portón negro',
  subtotal: 95,
  items: [
    { sku: '26009', nombre: 'Mouse Gamer Halion Mantis', precio_unitario: 65, cantidad: 1 },
    { sku: '26004', nombre: 'Cable Apple USB-C 240W',    precio_unitario: 15, cantidad: 2 },
  ],
}

describe('buildWhatsAppMessage', () => {
  it('incluye el código del pedido', () => {
    expect(buildWhatsAppMessage(pedido)).toContain('RP-2026-0007')
  })

  it('lista cada producto con cantidad y subtotal', () => {
    const m = buildWhatsAppMessage(pedido)
    expect(m).toContain('2 x Cable Apple USB-C 240W')
    expect(m).toContain('S/ 30.00')
  })

  it('incluye el total', () => {
    expect(buildWhatsAppMessage(pedido)).toContain('S/ 95.00')
  })

  it('incluye los datos de entrega', () => {
    const m = buildWhatsAppMessage(pedido)
    expect(m).toContain('Ana Torres')
    expect(m).toContain('Miraflores')
    expect(m).toContain('Portón negro')
  })

  it('omite la referencia si está vacía', () => {
    const m = buildWhatsAppMessage({ ...pedido, referencia: null })
    expect(m).not.toContain('Referencia')
  })
})

describe('whatsappUrl', () => {
  it('apunta al número del negocio y codifica el texto', () => {
    const url = whatsappUrl('hola mundo')
    expect(url.startsWith('https://wa.me/51935423395?text=')).toBe(true)
    expect(url).toContain('hola%20mundo')
  })
})
