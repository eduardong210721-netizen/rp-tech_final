import { describe, it, expect } from 'vitest'
import {
  nivelStock,
  disponibleReal,
  esFiltroEstado,
  normalizar,
  filtrarStock,
  resumirNiveles,
  limitarDelta,
  requiereConfirmacion,
  formatearDelta,
  interpretarAjuste,
  AJUSTE_MAXIMO,
  type ItemStock,
} from './logica'

function item(parcial: Partial<ItemStock> = {}): ItemStock {
  return {
    id: 'id-1',
    sku: '26001',
    nombre: 'Producto',
    categoriaSlug: 'cables',
    categoriaNombre: 'Cables',
    stock: 5,
    stockMinimo: 3,
    bajoPedido: false,
    activo: true,
    comprometido: 0,
    ...parcial,
  }
}

describe('nivelStock', () => {
  it('marca agotado cuando no queda ninguna unidad', () => {
    expect(nivelStock({ stock: 0, stockMinimo: 3, bajoPedido: false })).toBe('agotado')
  })

  it('distingue agotado de bajo: no son la misma urgencia', () => {
    expect(nivelStock({ stock: 1, stockMinimo: 3, bajoPedido: false })).toBe('bajo')
  })

  it('el mínimo exacto todavía cuenta como bajo', () => {
    expect(nivelStock({ stock: 3, stockMinimo: 3, bajoPedido: false })).toBe('bajo')
  })

  it('por encima del mínimo es normal', () => {
    expect(nivelStock({ stock: 4, stockMinimo: 3, bajoPedido: false })).toBe('normal')
  })

  it('bajo pedido no maneja stock, gane lo que gane la comparación', () => {
    expect(nivelStock({ stock: 0, stockMinimo: 3, bajoPedido: true })).toBe('bajo-pedido')
  })
})

describe('disponibleReal', () => {
  it('resta lo comprometido en pedidos sin confirmar', () => {
    expect(disponibleReal({ stock: 2, comprometido: 2 })).toBe(0)
  })

  it('puede quedar negativo y no se maquilla', () => {
    expect(disponibleReal({ stock: 1, comprometido: 3 })).toBe(-2)
  })
})

describe('esFiltroEstado', () => {
  it('acepta los valores conocidos', () => {
    expect(esFiltroEstado('agotado')).toBe(true)
    expect(esFiltroEstado('comprometido')).toBe(true)
  })

  it('rechaza basura de la URL y el ausente', () => {
    expect(esFiltroEstado('bajo-pedido')).toBe(false)
    expect(esFiltroEstado('<script>')).toBe(false)
    expect(esFiltroEstado(undefined)).toBe(false)
  })
})

describe('normalizar', () => {
  it('quita tildes y mayúsculas', () => {
    expect(normalizar('  Audífonos ')).toBe('audifonos')
  })
})

describe('filtrarStock', () => {
  const catalogo: ItemStock[] = [
    item({ id: 'a', sku: '26002', nombre: 'Audífonos Damix', stock: 10, categoriaSlug: 'audifonos' }),
    item({ id: 'b', sku: '26004', nombre: 'Cable Apple USB-C', stock: 0, categoriaSlug: 'cables' }),
    item({ id: 'c', sku: '26010', nombre: 'Power Bank ROMAX', stock: 2, categoriaSlug: 'powerbanks' }),
    item({ id: 'd', sku: '26012', nombre: 'Teclado HyperX', stock: 4, comprometido: 4, categoriaSlug: 'computo' }),
  ]

  it('sin criterios devuelve todo', () => {
    expect(filtrarStock(catalogo, {}).map((p) => p.id)).toEqual(['a', 'b', 'c', 'd'])
  })

  it('NUNCA reordena: el filtro conserva el orden de entrada', () => {
    const alReves = [...catalogo].reverse()
    expect(filtrarStock(alReves, {}).map((p) => p.id)).toEqual(['d', 'c', 'b', 'a'])
  })

  it('busca por nombre sin tildes', () => {
    expect(filtrarStock(catalogo, { q: 'audifonos' }).map((p) => p.id)).toEqual(['a'])
  })

  it('busca por SKU parcial', () => {
    expect(filtrarStock(catalogo, { q: '2601' }).map((p) => p.id)).toEqual(['c', 'd'])
  })

  it('filtra por estado agotado', () => {
    expect(filtrarStock(catalogo, { estado: 'agotado' }).map((p) => p.id)).toEqual(['b'])
  })

  it('filtra por estado bajo', () => {
    expect(filtrarStock(catalogo, { estado: 'bajo' }).map((p) => p.id)).toEqual(['c'])
  })

  it('filtra por comprometido', () => {
    expect(filtrarStock(catalogo, { estado: 'comprometido' }).map((p) => p.id)).toEqual(['d'])
  })

  it('filtra por categoría', () => {
    expect(filtrarStock(catalogo, { categoria: 'cables' }).map((p) => p.id)).toEqual(['b'])
  })

  it('compone búsqueda, estado y categoría', () => {
    expect(filtrarStock(catalogo, { q: 'cable', estado: 'agotado', categoria: 'cables' })).toHaveLength(1)
    expect(filtrarStock(catalogo, { q: 'cable', estado: 'normal', categoria: 'cables' })).toHaveLength(0)
  })
})

describe('resumirNiveles', () => {
  it('cuenta cada nivel y los comprometidos por separado', () => {
    const resumen = resumirNiveles([
      item({ stock: 0 }),
      item({ stock: 2 }),
      item({ stock: 9 }),
      item({ stock: 9, comprometido: 1 }),
      item({ bajoPedido: true }),
    ])
    expect(resumen).toEqual({
      todos: 5,
      agotado: 1,
      bajo: 1,
      normal: 2,
      'bajo-pedido': 1,
      comprometido: 1,
    })
  })
})

describe('limitarDelta', () => {
  it('deja pasar un ajuste normal', () => {
    expect(limitarDelta(10, 3)).toBe(3)
  })

  it('no permite un destino negativo: el suelo es -stock', () => {
    expect(limitarDelta(2, -5)).toBe(-2)
  })

  it('con stock cero no se puede restar', () => {
    expect(limitarDelta(0, -1)).toBe(0)
  })

  it('recorta al tope defensivo', () => {
    expect(limitarDelta(5, 100000)).toBe(AJUSTE_MAXIMO)
  })

  it('trunca decimales y neutraliza NaN', () => {
    expect(limitarDelta(10, 2.9)).toBe(2)
    expect(limitarDelta(10, Number.NaN)).toBe(0)
  })
})

describe('requiereConfirmacion', () => {
  it('un +1 nunca pregunta', () => {
    expect(requiereConfirmacion(11, 1)).toBe(false)
    expect(requiereConfirmacion(11, -1)).toBe(false)
  })

  it('atrapa el error real del dueño: 1 -> 11', () => {
    expect(requiereConfirmacion(1, 10)).toBe(true)
  })

  it('un +100 siempre pregunta', () => {
    expect(requiereConfirmacion(500, 100)).toBe(true)
  })

  it('pregunta si el ajuste mueve más unidades de las que hay', () => {
    expect(requiereConfirmacion(1, 5)).toBe(true)
  })

  it('el piso de 3 evita molestar en stocks diminutos', () => {
    expect(requiereConfirmacion(1, 3)).toBe(false)
    expect(requiereConfirmacion(0, 2)).toBe(false)
  })

  it('vaciar el estante entero no se considera anómalo', () => {
    expect(requiereConfirmacion(5, -5)).toBe(false)
  })

  it('un ajuste nulo no pregunta nada', () => {
    expect(requiereConfirmacion(5, 0)).toBe(false)
  })
})

describe('formatearDelta', () => {
  it('siempre lleva signo, salvo el cero que no tiene dirección', () => {
    expect(formatearDelta(3)).toBe('+3')
    expect(formatearDelta(-3)).toBe('−3')
    expect(formatearDelta(0)).toBe('0')
  })

  it('usa el menos tipográfico, no el guion ASCII', () => {
    expect(formatearDelta(-3).charCodeAt(0)).toBe(0x2212)
  })
})

describe('interpretarAjuste', () => {
  it('lee el menos tipográfico igual que el guion ASCII', () => {
    expect(interpretarAjuste(10, '−3').delta).toBe(-3)
    expect(interpretarAjuste(10, '-3').delta).toBe(-3)
  })

  it('conserva lo tecleado cuando todavía no es un número', () => {
    // Borrarle las teclas a alguien a mitad de palabra es la forma más rápida
    // de que acabe escribiendo otro número.
    expect(interpretarAjuste(10, '−')).toEqual({ delta: 0, texto: '−' })
    expect(interpretarAjuste(10, '+')).toEqual({ delta: 0, texto: '+' })
  })

  it('el campo vacío es un ajuste de cero, y se queda vacío', () => {
    expect(interpretarAjuste(10, '')).toEqual({ delta: 0, texto: '' })
  })

  it('al recortar, el campo pasa a mostrar el valor recortado', () => {
    // Pedir −9 con 2 en el estante: se ve −2, que es lo que se aplicaría.
    expect(interpretarAjuste(2, '-9')).toEqual({ delta: -2, texto: '−2' })
    expect(interpretarAjuste(5, String(AJUSTE_MAXIMO + 1))).toEqual({
      delta: AJUSTE_MAXIMO,
      texto: `+${AJUSTE_MAXIMO}`,
    })
  })

  it('si el valor cabe, el texto es exactamente el tecleado', () => {
    expect(interpretarAjuste(10, '4')).toEqual({ delta: 4, texto: '4' })
  })
})
