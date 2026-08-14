import { describe, it, expect } from 'vitest'
import { esAdminPermitido } from './adminAccess'

describe('esAdminPermitido', () => {
  it('acepta una coincidencia exacta', () => {
    expect(esAdminPermitido('dueno@rptech.pe', 'dueno@rptech.pe')).toBe(true)
  })

  it('ignora diferencias de mayúsculas/minúsculas', () => {
    expect(esAdminPermitido('Dueno@RPTech.pe', 'dueno@rptech.pe')).toBe(true)
    expect(esAdminPermitido('dueno@rptech.pe', 'DUENO@RPTECH.PE')).toBe(true)
  })

  it('recorta espacios alrededor del correo y de la lista', () => {
    expect(esAdminPermitido('  dueno@rptech.pe  ', ' dueno@rptech.pe , otro@rptech.pe ')).toBe(true)
  })

  it('acepta cualquier correo de una lista con varios', () => {
    expect(esAdminPermitido('otro@rptech.pe', 'dueno@rptech.pe,otro@rptech.pe')).toBe(true)
  })

  it('deniega una lista vacía', () => {
    expect(esAdminPermitido('dueno@rptech.pe', '')).toBe(false)
  })

  it('deniega una lista indefinida', () => {
    expect(esAdminPermitido('dueno@rptech.pe', undefined)).toBe(false)
    expect(esAdminPermitido('dueno@rptech.pe', null)).toBe(false)
  })

  it('deniega un correo que no está en la lista', () => {
    expect(esAdminPermitido('intruso@gmail.com', 'dueno@rptech.pe')).toBe(false)
  })

  it('deniega un correo indefinido o vacío', () => {
    expect(esAdminPermitido(undefined, 'dueno@rptech.pe')).toBe(false)
    expect(esAdminPermitido(null, 'dueno@rptech.pe')).toBe(false)
    expect(esAdminPermitido('   ', 'dueno@rptech.pe')).toBe(false)
  })

  it('NO acepta un correo que solo contiene al permitido como substring', () => {
    expect(
      esAdminPermitido('notjjjeampierdel@gmail.com.evil.com', 'jjjeampierdel@gmail.com'),
    ).toBe(false)
  })

  it('NO acepta un correo del que el permitido es substring por el otro lado', () => {
    expect(esAdminPermitido('jjjeampierdel@gmail.com', 'x-jjjeampierdel@gmail.com')).toBe(false)
  })

  it('una lista con solo comas o espacios deniega a todos', () => {
    expect(esAdminPermitido('dueno@rptech.pe', ' , , ')).toBe(false)
  })
})
