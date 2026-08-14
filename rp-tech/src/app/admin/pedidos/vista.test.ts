import { describe, expect, it } from 'vitest'
import { NEGOCIO } from '@/lib/negocio'
import {
  coincidePedido,
  contarPorEstado,
  esEstadoValido,
  fechaLima,
  filtrarPedidos,
  lineaMueveStock,
  mensajeParaCliente,
  notaStockLinea,
  notaStockPedido,
  telefonoInternacional,
  telefonoLegible,
  textoEntrega,
  unidades,
  unidadesADescontar,
  unidadesADevolver,
  whatsappCliente,
  type OrderEstado,
  type OrderItemRow,
  type OrderRow,
} from './vista'

function pedido(parcial: Partial<OrderRow> = {}): OrderRow {
  return {
    id: 'id-1',
    codigo: 'RP-2026-0007',
    cliente_nombre: 'María Pérez',
    cliente_telefono: '935423395',
    distrito: 'San Miguel',
    referencia: null,
    subtotal: 85,
    estado: 'pendiente',
    created_at: '2026-08-13T15:42:00.000Z',
    ...parcial,
  }
}

function item(parcial: Partial<OrderItemRow> = {}): OrderItemRow {
  return {
    id: 'item-1',
    sku: '26002',
    nombre: 'Cable Tipo C 240W',
    precio_unitario: 25,
    cantidad: 2,
    stock_descontado: false,
    existe_producto: true,
    bajo_pedido: false,
    ...parcial,
  }
}

describe('esEstadoValido', () => {
  it('acepta los cuatro estados y rechaza cualquier otra cosa', () => {
    expect(esEstadoValido('pendiente')).toBe(true)
    expect(esEstadoValido('cancelado')).toBe(true)
    expect(esEstadoValido('entregadoo')).toBe(false)
    expect(esEstadoValido(undefined)).toBe(false)
    expect(esEstadoValido(3)).toBe(false)
  })
})

describe('coincidePedido', () => {
  it('sin término, todo coincide', () => {
    expect(coincidePedido(pedido(), '')).toBe(true)
    expect(coincidePedido(pedido(), '   ')).toBe(true)
  })

  it('encuentra por código completo o por su parte final', () => {
    expect(coincidePedido(pedido(), 'RP-2026-0007')).toBe(true)
    expect(coincidePedido(pedido(), 'rp-2026')).toBe(true)
    expect(coincidePedido(pedido(), '0007')).toBe(true)
  })

  it('ignora mayúsculas y tildes en el nombre', () => {
    expect(coincidePedido(pedido(), 'maria')).toBe(true)
    expect(coincidePedido(pedido(), 'PEREZ')).toBe(true)
    expect(coincidePedido(pedido(), 'Pérez')).toBe(true)
  })

  it('encuentra el celular aunque venga con espacios o con +51', () => {
    expect(coincidePedido(pedido(), '935 423 395')).toBe(true)
    expect(coincidePedido(pedido(), '+51 935423395')).toBe(false) // el 51 no está guardado
    expect(coincidePedido(pedido(), '423')).toBe(true)
  })

  it('encuentra por distrito', () => {
    expect(coincidePedido(pedido(), 'san miguel')).toBe(true)
  })

  it('no inventa coincidencias', () => {
    expect(coincidePedido(pedido(), 'zzz')).toBe(false)
  })
})

describe('filtrarPedidos', () => {
  const lista = [
    pedido({ id: 'a', codigo: 'RP-2026-0001', estado: 'pendiente', cliente_nombre: 'Ana' }),
    pedido({ id: 'b', codigo: 'RP-2026-0002', estado: 'confirmado', cliente_nombre: 'Beto' }),
    pedido({ id: 'c', codigo: 'RP-2026-0003', estado: 'pendiente', cliente_nombre: 'Ana Luz' }),
  ]

  it('sin filtro devuelve todo, en el mismo orden que entró', () => {
    expect(filtrarPedidos(lista, {}).map((p) => p.id)).toEqual(['a', 'b', 'c'])
  })

  it('filtra por estado sin reordenar', () => {
    expect(filtrarPedidos(lista, { estado: 'pendiente' }).map((p) => p.id)).toEqual(['a', 'c'])
  })

  it('combina estado y búsqueda', () => {
    expect(filtrarPedidos(lista, { estado: 'pendiente', q: 'ana luz' }).map((p) => p.id)).toEqual([
      'c',
    ])
    expect(filtrarPedidos(lista, { estado: 'confirmado', q: 'ana' })).toEqual([])
  })
})

describe('contarPorEstado', () => {
  it('cuenta los cuatro estados, incluidos los que están en cero', () => {
    const cuenta = contarPorEstado([
      { estado: 'pendiente' as OrderEstado },
      { estado: 'pendiente' as OrderEstado },
      { estado: 'cancelado' as OrderEstado },
    ])
    expect(cuenta).toEqual({ pendiente: 2, confirmado: 0, entregado: 0, cancelado: 1 })
  })
})

describe('telefonoInternacional', () => {
  it('antepone 51 al celular peruano que guarda el checkout', () => {
    expect(telefonoInternacional('935423395')).toBe('51935423395')
  })

  it('respeta un número que ya trae el código de país', () => {
    expect(telefonoInternacional('+51 935 423 395')).toBe('51935423395')
  })

  it('devuelve null antes que abrir un chat con un número inventado', () => {
    expect(telefonoInternacional('123')).toBeNull()
    expect(telefonoInternacional('')).toBeNull()
    expect(telefonoInternacional('835423395')).toBeNull()
  })
})

describe('telefonoLegible', () => {
  it('agrupa el celular de nueve dígitos', () => {
    expect(telefonoLegible('935423395')).toBe('935 423 395')
  })

  it('deja intacto lo que no reconoce', () => {
    expect(telefonoLegible('+1 555 0100')).toBe('+1 555 0100')
  })
})

describe('mensajeParaCliente / whatsappCliente', () => {
  const soles = (n: number) => `S/ ${n.toFixed(2)}`
  const lineas = [
    { nombre: 'Cable Apple USB-C a USB-C 240W', cantidad: 1, precio_unitario: 60 },
    { nombre: 'Audífonos ROMAX RM-S1', cantidad: 2, precio_unitario: 12.5 },
  ]

  it('el mensaje nombra al cliente, el código y el monto', () => {
    const texto = mensajeParaCliente(pedido(), 'S/ 85.00')
    expect(texto).toContain('María')
    expect(texto).not.toContain('María Pérez')
    expect(texto).toContain('RP-2026-0007')
    expect(texto).toContain('S/ 85.00')
  })

  it('con una sola unidad muestra el precio y ya', () => {
    const texto = mensajeParaCliente(pedido(), 'S/ 85.00', lineas, soles)
    expect(texto).toContain('• Cable Apple USB-C a USB-C 240W (S/ 60.00)')
  })

  it('con varias unidades muestra la multiplicación completa', () => {
    // "S/ 25.00" a secas junto a dos unidades se lee como precio unitario y
    // el cliente cree que le están cobrando el doble.
    const texto = mensajeParaCliente(pedido(), 'S/ 85.00', lineas, soles)
    expect(texto).toContain('• Audífonos ROMAX RM-S1 (2 × S/ 12.50 = S/ 25.00)')
  })

  it('un pedido pendiente pregunta por el pago; uno confirmado ya no', () => {
    const pendiente = mensajeParaCliente(pedido(), 'S/ 85.00', lineas, soles)
    expect(pendiente).toContain('Yape')

    const confirmado = mensajeParaCliente(
      pedido({ estado: 'confirmado' }),
      'S/ 85.00',
      lineas,
      soles,
    )
    // Preguntar "¿cómo vas a pagar?" en un pedido ya confirmado y separado
    // hace ver que el dueño no lleva el control de sus propias ventas.
    expect(confirmado).not.toContain('Yape')
    expect(confirmado).toContain('confirmado')
  })

  it('ofrece las dos entregas: el punto de recojo y el distrito del cliente', () => {
    const texto = mensajeParaCliente(pedido(), 'S/ 85.00', lineas, soles)
    expect(texto).toContain(NEGOCIO.puntoRecojo as string)
    expect(texto).toContain('San Miguel')
  })

  it('un pedido entregado no vuelve a pedir datos: pregunta cómo le fue', () => {
    const texto = mensajeParaCliente(pedido({ estado: 'entregado' }), 'S/ 85.00')
    expect(texto).not.toContain('Yape')
    expect(texto).not.toContain(NEGOCIO.puntoRecojo as string)
  })

  it('un pedido cancelado deja la puerta abierta sin cobrar nada', () => {
    const texto = mensajeParaCliente(pedido({ estado: 'cancelado' }), 'S/ 85.00')
    expect(texto).not.toContain('Yape')
    expect(texto).toContain('RP-2026-0007')
  })

  it('el enlace apunta al número DEL CLIENTE y lleva el mensaje codificado', () => {
    const url = whatsappCliente(pedido(), 'S/ 85.00')
    expect(url).toContain('https://wa.me/51935423395?text=')
    expect(url).toContain(encodeURIComponent('RP-2026-0007'))
  })

  it('sin número usable no hay enlace', () => {
    expect(whatsappCliente(pedido({ cliente_telefono: '000' }), 'S/ 1.00')).toBeNull()
  })
})

describe('textoEntrega', () => {
  it('incluye la referencia cuando existe', () => {
    const texto = textoEntrega(pedido({ referencia: 'Frente al parque, casa azul' }))
    expect(texto).toContain('Distrito: San Miguel')
    expect(texto).toContain('Referencia: Frente al parque, casa azul')
    expect(texto).toContain('Celular: 935 423 395')
    expect(texto).toContain('Pedido RP-2026-0007')
  })

  it('no deja una línea vacía cuando no hay referencia', () => {
    expect(textoEntrega(pedido())).not.toContain('Referencia')
  })
})

describe('stock por línea', () => {
  it('una línea normal sin confirmar descuenta al confirmar', () => {
    const linea = item()
    expect(lineaMueveStock(linea)).toBe(true)
    expect(notaStockLinea(linea, 'pendiente').texto).toBe('Stock sin descontar')
    expect(notaStockLinea(linea, 'pendiente').descontado).toBe(false)
  })

  it('una línea ya descontada lo dice', () => {
    const nota = notaStockLinea(item({ stock_descontado: true }), 'confirmado')
    expect(nota).toEqual({ texto: 'Stock descontado', descontado: true })
  })

  it('cancelado no dice "descontado": cancelar_pedido() devolvió esas unidades', () => {
    // La base deja stock_descontado en true después de cancelar; leerla a
    // secas mentiría sobre dónde está el inventario.
    expect(notaStockLinea(item({ stock_descontado: true }), 'cancelado')).toEqual({
      texto: 'Stock devuelto',
      descontado: false,
    })
    expect(notaStockLinea(item({ stock_descontado: false }), 'cancelado').texto).toBe(
      'Nunca movió stock',
    )
  })

  it('bajo pedido y producto retirado no mueven stock', () => {
    expect(lineaMueveStock(item({ bajo_pedido: true }))).toBe(false)
    expect(lineaMueveStock(item({ existe_producto: false }))).toBe(false)
    expect(notaStockLinea(item({ bajo_pedido: true }), 'pendiente').texto).toContain('Bajo pedido')
    expect(notaStockLinea(item({ existe_producto: false }), 'pendiente').texto).toContain(
      'retirado',
    )
  })

  it('el conteo a descontar salta lo que confirmar_pedido() salta', () => {
    const lineas = [
      item({ id: '1', cantidad: 2 }),
      item({ id: '2', cantidad: 5, bajo_pedido: true }),
      item({ id: '3', cantidad: 3, existe_producto: false }),
      item({ id: '4', cantidad: 4, stock_descontado: true }),
    ]
    expect(unidadesADescontar(lineas)).toBe(2)
    expect(unidadesADevolver(lineas)).toBe(4)
  })

  it('un pedido nunca confirmado no devuelve nada al cancelarse', () => {
    expect(unidadesADevolver([item({ cantidad: 9 })])).toBe(0)
  })
})

describe('notaStockPedido', () => {
  it('pendiente anuncia cuántas unidades va a descontar', () => {
    expect(notaStockPedido('pendiente', { porDescontar: 3, porDevolver: 0 })).toContain(
      '3 unidades',
    )
    expect(notaStockPedido('pendiente', { porDescontar: 1, porDevolver: 0 })).toContain('1 unidad')
  })

  it('pendiente sin nada que descontar no promete un descuento', () => {
    expect(notaStockPedido('pendiente', { porDescontar: 0, porDevolver: 0 })).toBe(
      'No mueve stock: ninguna línea de este pedido descuenta inventario.',
    )
  })

  it('cancelado dice cuánto se devolvió, y no inventa devoluciones', () => {
    expect(notaStockPedido('cancelado', { porDescontar: 0, porDevolver: 2 })).toContain(
      'Se devolvieron 2 unidades',
    )
    // "Se devolvieron 1 unidad" delata una pantalla generada, no escrita.
    expect(notaStockPedido('cancelado', { porDescontar: 0, porDevolver: 1 })).toBe(
      'Cancelado. Se devolvió 1 unidad al stock.',
    )
    expect(notaStockPedido('cancelado', { porDescontar: 0, porDevolver: 0 })).toBe(
      'Cancelado. Nunca llegó a descontar stock.',
    )
  })

  it('confirmado y entregado explican dónde quedó el stock', () => {
    expect(notaStockPedido('confirmado', { porDescontar: 0, porDevolver: 2 })).toContain(
      'Stock descontado',
    )
    expect(notaStockPedido('entregado', { porDescontar: 0, porDevolver: 2 })).toContain(
      'se descontó al confirmar',
    )
  })
})

describe('unidades', () => {
  it('respeta el singular', () => {
    expect(unidades(1)).toBe('1 unidad')
    expect(unidades(0)).toBe('0 unidades')
    expect(unidades(4)).toBe('4 unidades')
  })
})

describe('fechaLima', () => {
  it('formatea en la zona de Lima, no en la del servidor', () => {
    // 2026-08-13T15:42Z son las 10:42 en Lima (UTC-5).
    const texto = fechaLima('2026-08-13T15:42:00.000Z')
    expect(texto).toContain('13')
    expect(texto).toContain('10:42')
  })

  it('no revienta con una fecha inválida', () => {
    expect(fechaLima('no es fecha')).toBe('')
  })
})
