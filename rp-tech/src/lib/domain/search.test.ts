import { describe, it, expect } from 'vitest'
import { sanitizarBusqueda } from './search'

describe('sanitizarBusqueda', () => {
  it('deja pasar una búsqueda normal', () => {
    expect(sanitizarBusqueda('cable tipo c')).toBe('cable tipo c')
  })

  it('conserva las tildes y la ñ', () => {
    expect(sanitizarBusqueda('audífonos damix')).toBe('audífonos damix')
  })

  it('conserva números y SKU', () => {
    expect(sanitizarBusqueda('26009')).toBe('26009')
  })

  it('elimina la coma, que es el separador de filtros de PostgREST', () => {
    expect(sanitizarBusqueda('zzz,costo.gt.40')).not.toContain(',')
  })

  it('neutraliza el oráculo de costo completo', () => {
    const r = sanitizarBusqueda('zzz,costo.gt.40,marca.ilike.zzz')
    expect(r).not.toContain(',')
    expect(r).not.toContain('.')
    expect(r).not.toMatch(/costo\.gt/)
  })

  it('elimina paréntesis, que agrupan filtros', () => {
    expect(sanitizarBusqueda('a(b)c')).not.toMatch(/[()]/)
  })

  it('elimina los comodines de ilike', () => {
    const r = sanitizarBusqueda('100%_todo')
    expect(r).not.toContain('%')
    expect(r).not.toContain('_')
  })

  it('devuelve cadena vacía si no queda nada útil', () => {
    expect(sanitizarBusqueda(',,,...')).toBe('')
    expect(sanitizarBusqueda('   ')).toBe('')
  })

  it('recorta términos absurdamente largos', () => {
    expect(sanitizarBusqueda('a'.repeat(500)).length).toBeLessThanOrEqual(60)
  })
})
