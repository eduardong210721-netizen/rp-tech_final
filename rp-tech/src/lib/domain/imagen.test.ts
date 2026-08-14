import { describe, it, expect } from 'vitest'
import {
  MAX_BYTES,
  ALT_MAX,
  detectarTipoReal,
  extensionDe,
  validarArchivoImagen,
  nombreObjetoSeguro,
  esRutaDeObjetoSegura,
  validarAlt,
} from './imagen'

/** Cabecera mínima de cada formato, rellenada hasta `largo` bytes. */
function bytesCon(firma: number[], largo = 32): Uint8Array {
  const b = new Uint8Array(largo)
  b.set(firma, 0)
  return b
}

const PNG = () => bytesCon([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
const JPEG = () => bytesCon([0xff, 0xd8, 0xff, 0xe0])
const WEBP = () => {
  const b = bytesCon([0x52, 0x49, 0x46, 0x46, 0x10, 0x00, 0x00, 0x00])
  b.set([0x57, 0x45, 0x42, 0x50], 8) // "WEBP"
  return b
}

describe('detectarTipoReal', () => {
  it('reconoce PNG, JPEG y WebP por sus bytes', () => {
    expect(detectarTipoReal(PNG())).toBe('image/png')
    expect(detectarTipoReal(JPEG())).toBe('image/jpeg')
    expect(detectarTipoReal(WEBP())).toBe('image/webp')
  })

  it('rechaza lo que no es imagen aunque el cliente lo llame imagen', () => {
    const texto = new TextEncoder().encode('<?php system($_GET["c"]); ?>')
    expect(detectarTipoReal(texto)).toBeNull()
    expect(detectarTipoReal(new Uint8Array([0x25, 0x50, 0x44, 0x46]))).toBeNull() // %PDF
    expect(detectarTipoReal(new Uint8Array(0))).toBeNull()
  })

  it('no confunde un RIFF que no es WebP (por ejemplo un .wav)', () => {
    const wav = bytesCon([0x52, 0x49, 0x46, 0x46])
    wav.set([0x57, 0x41, 0x56, 0x45], 8) // "WAVE"
    expect(detectarTipoReal(wav)).toBeNull()
  })

  it('no lee fuera del buffer cuando el archivo es más corto que la firma', () => {
    expect(detectarTipoReal(new Uint8Array([0x52, 0x49]))).toBeNull()
    expect(detectarTipoReal(new Uint8Array([0xff, 0xd8]))).toBeNull()
  })
})

describe('validarArchivoImagen — tipo permitido', () => {
  it('acepta los tres formatos del bucket', () => {
    expect(validarArchivoImagen({ nombre: 'foto.png', tamano: 32, bytes: PNG() })).toEqual({
      ok: true,
      tipo: 'image/png',
      extension: 'png',
    })
    expect(validarArchivoImagen({ nombre: 'foto.jpeg', tamano: 32, bytes: JPEG() })).toEqual({
      ok: true,
      tipo: 'image/jpeg',
      extension: 'jpg',
    })
    expect(validarArchivoImagen({ nombre: 'foto.webp', tamano: 32, bytes: WEBP() })).toEqual({
      ok: true,
      tipo: 'image/webp',
      extension: 'webp',
    })
  })

  it('rechaza un archivo que no es imagen aunque se llame .png', () => {
    const bytes = new TextEncoder().encode('#!/bin/sh\nrm -rf /\n')
    const r = validarArchivoImagen({ nombre: 'troyano.png', tamano: bytes.length, bytes })
    expect(r.ok).toBe(false)
    expect(r.ok === false && r.error).toMatch(/no es una imagen/i)
  })

  it('rechaza una imagen real cuya extensión miente sobre su contenido', () => {
    const r = validarArchivoImagen({ nombre: 'foto.png', tamano: 32, bytes: JPEG() })
    expect(r.ok).toBe(false)
    expect(r.ok === false && r.error).toMatch(/image\/jpeg/)
  })
})

describe('validarArchivoImagen — tamaño', () => {
  it('rechaza el archivo vacío', () => {
    const r = validarArchivoImagen({ nombre: 'foto.png', tamano: 0, bytes: new Uint8Array(0) })
    expect(r.ok).toBe(false)
    expect(r.ok === false && r.error).toMatch(/vacío/i)
  })

  it('acepta justo en el límite y rechaza un byte por encima', () => {
    const justo = bytesCon([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], MAX_BYTES)
    expect(validarArchivoImagen({ nombre: 'f.png', tamano: MAX_BYTES, bytes: justo }).ok).toBe(true)

    const pasado = bytesCon([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], MAX_BYTES + 1)
    const r = validarArchivoImagen({ nombre: 'f.png', tamano: MAX_BYTES + 1, bytes: pasado })
    expect(r.ok).toBe(false)
    expect(r.ok === false && r.error).toMatch(/máximo/i)
  })

  it('no se fía del tamaño declarado: mide también los bytes recibidos', () => {
    const pasado = bytesCon([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], MAX_BYTES + 1)
    expect(validarArchivoImagen({ nombre: 'f.png', tamano: 10, bytes: pasado }).ok).toBe(false)
  })
})

describe('validarArchivoImagen — extensión', () => {
  it('rechaza extensiones fuera de la lista', () => {
    for (const nombre of ['foto.svg', 'foto.gif', 'foto.php', 'foto.webp.php', 'foto']) {
      const r = validarArchivoImagen({ nombre, tamano: 32, bytes: PNG() })
      expect(r.ok, nombre).toBe(false)
    }
  })

  it('acepta la extensión en mayúsculas', () => {
    expect(validarArchivoImagen({ nombre: 'FOTO.PNG', tamano: 32, bytes: PNG() }).ok).toBe(true)
  })

  it('rechaza un nombre que empieza por punto', () => {
    expect(validarArchivoImagen({ nombre: '.png', tamano: 32, bytes: PNG() }).ok).toBe(false)
  })

  it('guarda .jpg para cualquier JPEG, venga como venga', () => {
    expect(extensionDe('image/jpeg')).toBe('jpg')
  })
})

describe('nombreObjetoSeguro', () => {
  const SUFIJO = 'a1b2c3d4'

  it('produce <sku>-<sufijo>.<ext> en la raíz del bucket', () => {
    expect(nombreObjetoSeguro('26011', 'image/webp', SUFIJO)).toBe('26011-a1b2c3d4.webp')
  })

  it('NUNCA prefija con "productos/": eso anidaba productos/productos/ y rompía las URL', () => {
    expect(nombreObjetoSeguro('productos', 'image/webp', SUFIJO)).not.toContain('productos/')
    expect(nombreObjetoSeguro('26011', 'image/png', SUFIJO).startsWith('productos/')).toBe(false)
  })

  it('neutraliza cualquier intento de escribir fuera del bucket desde el SKU', () => {
    for (const sku of ['../../etc/passwd', 'a/b/c', '..', '/', './oculto', 'x\\y']) {
      const nombre = nombreObjetoSeguro(sku, 'image/webp', SUFIJO)
      expect(nombre, sku).not.toContain('/')
      expect(nombre, sku).not.toContain('\\')
      expect(nombre, sku).not.toContain('..')
      expect(nombre, sku).toMatch(/^[a-z0-9][a-z0-9-]*\.webp$/)
    }
  })

  it('normaliza tildes, espacios y mayúsculas', () => {
    expect(nombreObjetoSeguro('Extensión de Corriente', 'image/jpeg', SUFIJO)).toBe(
      'extension-de-corriente-a1b2c3d4.jpg',
    )
  })

  it('cae a "producto" cuando el SKU no deja ni un carácter usable', () => {
    expect(nombreObjetoSeguro('///', 'image/png', SUFIJO)).toBe(`producto-${SUFIJO}.png`)
    expect(nombreObjetoSeguro('', 'image/png', SUFIJO)).toBe(`producto-${SUFIJO}.png`)
  })

  it('acorta el SKU largo sin dejar un guion colgando', () => {
    const nombre = nombreObjetoSeguro('x'.repeat(80), 'image/webp', SUFIJO)
    expect(nombre).toBe(`${'x'.repeat(32)}-${SUFIJO}.webp`)
    expect(nombre).not.toContain('--')
  })

  it('dos subidas del mismo SKU no comparten nombre', () => {
    expect(nombreObjetoSeguro('26011', 'image/webp', 'aaaaaaaa')).not.toBe(
      nombreObjetoSeguro('26011', 'image/webp', 'bbbbbbbb'),
    )
  })

  it('exige un sufijo hexadecimal: no acepta uno que traiga ruta', () => {
    expect(() => nombreObjetoSeguro('26011', 'image/webp', '../x')).toThrow()
    expect(() => nombreObjetoSeguro('26011', 'image/webp', 'zz')).toThrow()
    expect(() => nombreObjetoSeguro('26011', 'image/webp', '')).toThrow()
  })
})

describe('esRutaDeObjetoSegura', () => {
  it('acepta los nombres que ya existen en el bucket', () => {
    expect(esRutaDeObjetoSegura('26002.webp')).toBe(true)
    expect(esRutaDeObjetoSegura('26011-a1b2c3d4.webp')).toBe(true)
  })

  it('rechaza todo lo que salga del objeto', () => {
    for (const ruta of ['../otro.webp', 'productos/26002.webp', '/26002.webp', '', '26002', 'a.svg']) {
      expect(esRutaDeObjetoSegura(ruta), ruta).toBe(false)
    }
  })
})

describe('validarAlt', () => {
  it('exige texto', () => {
    expect(validarAlt(null).ok).toBe(false)
    expect(validarAlt('').ok).toBe(false)
    expect(validarAlt('   ').ok).toBe(false)
    expect(validarAlt('ab').ok).toBe(false)
  })

  it('normaliza espacios y recorta', () => {
    const r = validarAlt('  Cable   Tipo C\n de 1 metro  ')
    expect(r).toEqual({ ok: true, alt: 'Cable Tipo C de 1 metro' })
  })

  it('quita los signos que podrían componer marcado en cualquier destino', () => {
    const r = validarAlt('Cable <script>alert(1)</script> Tipo C')
    expect(r.ok).toBe(true)
    expect(r.ok === true && r.alt).toBe('Cable scriptalert(1)/script Tipo C')
    expect(r.ok === true && r.alt).not.toContain('<')
    expect(r.ok === true && r.alt).not.toContain('>')
  })

  it('rechaza un alt más largo que el máximo', () => {
    expect(validarAlt('a'.repeat(ALT_MAX)).ok).toBe(true)
    expect(validarAlt('a'.repeat(ALT_MAX + 1)).ok).toBe(false)
  })
})
