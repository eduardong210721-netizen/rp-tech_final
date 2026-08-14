import { describe, it, expect } from 'vitest'
import { formatPEN } from './format'

describe('formatPEN', () => {
  it('formatea enteros con dos decimales', () => {
    expect(formatPEN(15)).toBe('S/ 15.00')
  })

  it('formatea decimales', () => {
    expect(formatPEN(8.5)).toBe('S/ 8.50')
  })

  it('formatea miles con separador', () => {
    expect(formatPEN(1250)).toBe('S/ 1,250.00')
  })

  it('formatea cero', () => {
    expect(formatPEN(0)).toBe('S/ 0.00')
  })
})
