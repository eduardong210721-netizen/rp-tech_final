import { describe, it, expect } from 'vitest'
import {
  bloqueantesPendientes,
  pendientes,
  requisitosPublicacion,
  type DatosPublicacion,
} from './publicacion'

const COMPLETO: DatosPublicacion = {
  precio: 15,
  costo: 7, // sintético: los costos reales no viajan en el repositorio
  categoriaId: '00000000-0000-4000-8000-000000000001',
  fotos: 1,
  especificaciones: 2,
  descripcionCorta: 'Cable de 2 metros',
  stock: 10,
  bajoPedido: false,
}

describe('requisitosPublicacion', () => {
  it('un producto completo no tiene pendientes', () => {
    expect(pendientes(requisitosPublicacion(COMPLETO))).toEqual([])
  })

  it('el precio en cero bloquea la activación', () => {
    const reqs = requisitosPublicacion({ ...COMPLETO, precio: 0 })
    expect(bloqueantesPendientes(reqs).map((r) => r.clave)).toEqual(['precio'])
  })

  it('faltar la categoría bloquea la activación', () => {
    const reqs = requisitosPublicacion({ ...COMPLETO, categoriaId: '  ' })
    expect(bloqueantesPendientes(reqs).map((r) => r.clave)).toEqual(['categoria'])
  })

  it('la foto falta pero no bloquea: la tienda tiene imagen de relleno', () => {
    const reqs = requisitosPublicacion({ ...COMPLETO, fotos: 0 })
    expect(pendientes(reqs).map((r) => r.clave)).toEqual(['foto'])
    expect(bloqueantesPendientes(reqs)).toEqual([])
  })

  it('una sola especificación no alcanza: la tarjeta muestra dos', () => {
    const reqs = requisitosPublicacion({ ...COMPLETO, especificaciones: 1 })
    expect(pendientes(reqs).map((r) => r.clave)).toEqual(['especificaciones'])
  })

  it('sin unidades avisa, salvo que sea bajo pedido', () => {
    expect(
      pendientes(requisitosPublicacion({ ...COMPLETO, stock: 0 })).map((r) => r.clave),
    ).toEqual(['disponibilidad'])
    expect(
      pendientes(requisitosPublicacion({ ...COMPLETO, stock: 0, bajoPedido: true })),
    ).toEqual([])
  })

  it('el costo en cero avisa porque el margen saldría al 100%', () => {
    expect(pendientes(requisitosPublicacion({ ...COMPLETO, costo: 0 })).map((r) => r.clave)).toEqual(
      ['costo'],
    )
  })
})
