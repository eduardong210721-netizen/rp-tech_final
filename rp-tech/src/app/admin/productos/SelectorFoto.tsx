'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { ALT_MAX } from '@/lib/domain/imagen'
import { prepararImagen, pesoLegible } from './prepararImagen'

/**
 * Elegir una foto y describirla. Se usa en los dos sitios donde entra una
 * imagen: el formulario de creación (que la sube en cuanto el producto
 * existe) y la galería del formulario de edición.
 *
 * La conversión a WebP ocurre al elegir el archivo, no al enviar: así el
 * dueño ve de una el peso real de lo que va a subir en vez de descubrir un
 * rechazo después de rellenar todo.
 */
export default function SelectorFoto({
  idPrefijo,
  archivo,
  alt,
  onArchivo,
  onAlt,
  deshabilitado = false,
}: {
  idPrefijo: string
  archivo: File | null
  alt: string
  onArchivo: (archivo: File | null) => void
  onAlt: (alt: string) => void
  deshabilitado?: boolean
}) {
  const [preparando, setPreparando] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const vistaPrevia = useMemo(() => (archivo ? URL.createObjectURL(archivo) : null), [archivo])

  // Una URL de objeto retiene el blob en memoria hasta que se revoca a mano.
  useEffect(() => {
    if (!vistaPrevia) return
    return () => URL.revokeObjectURL(vistaPrevia)
  }, [vistaPrevia])

  // El input de archivo es no controlado; cuando el padre limpia la selección
  // (por ejemplo tras subir), hay que vaciarlo o seguiría mostrando el nombre.
  useEffect(() => {
    if (!archivo && inputRef.current) inputRef.current.value = ''
  }, [archivo])

  async function alElegir(elegido: File | undefined) {
    setError(null)
    setAviso(null)

    if (!elegido) {
      onArchivo(null)
      return
    }

    setPreparando(true)
    const resultado = await prepararImagen(elegido)
    setPreparando(false)

    if (!resultado.ok) {
      onArchivo(null)
      if (inputRef.current) inputRef.current.value = ''
      setError(resultado.error)
      return
    }

    const { foto } = resultado
    onArchivo(foto.archivo)
    setAviso(
      foto.sinConvertir
        ? `${pesoLegible(foto.archivo.size)} · se sube sin optimizar`
        : `${pesoLegible(foto.bytesOriginal)} → ${pesoLegible(foto.archivo.size)} en WebP`,
    )
  }

  const idArchivo = `${idPrefijo}-archivo`
  const idAlt = `${idPrefijo}-alt`

  return (
    <div className="grid gap-4 sm:grid-cols-[6rem_1fr] sm:items-start">
      <div className="relative flex aspect-square w-24 items-center justify-center overflow-hidden rounded-lg border border-hairline bg-paper-alt">
        {vistaPrevia ? (
          /* Vista previa de un blob que solo existe en memoria: next/image no
             puede optimizar algo que todavía no está en Storage. */
          // eslint-disable-next-line @next/next/no-img-element
          <img src={vistaPrevia} alt="" className="h-full w-full object-contain p-1.5" />
        ) : (
          <span className="eyebrow">Sin foto</span>
        )}
      </div>

      <div className="min-w-0 space-y-3">
        <div>
          <label htmlFor={idArchivo} className="mb-1.5 block text-sm text-ink-soft">
            Archivo
          </label>
          <input
            ref={inputRef}
            id={idArchivo}
            type="file"
            accept="image/webp,image/jpeg,image/png"
            disabled={deshabilitado || preparando}
            onChange={(e) => void alElegir(e.target.files?.[0])}
            className="block w-full text-sm text-ink-soft file:mr-3 file:rounded-full file:border file:border-hairline file:bg-paper file:px-4 file:py-2 file:text-sm file:text-ink file:transition-colors file:duration-(--dur-fast) hover:file:border-ink disabled:opacity-50"
          />
          <p className="mt-1.5 font-mono text-spec text-ink-muted">
            {preparando
              ? 'Optimizando…'
              : (aviso ?? 'WebP, JPG o PNG · se reduce a 1600 px antes de subir')}
          </p>
        </div>

        <div>
          <label htmlFor={idAlt} className="mb-1.5 block text-sm text-ink-soft">
            Qué se ve en la foto
          </label>
          <input
            id={idAlt}
            value={alt}
            maxLength={ALT_MAX}
            disabled={deshabilitado}
            onChange={(e) => onAlt(e.target.value)}
            placeholder="Cable Tipo C trenzado de 1 metro, color negro"
            className="w-full rounded-lg border border-hairline bg-paper px-3 py-2 text-sm text-ink transition-colors duration-(--dur-fast) placeholder:text-ink-muted hover:border-ink-muted disabled:opacity-50"
          />
          <p className="mt-1.5 text-xs text-ink-muted">
            Obligatorio. Es lo que lee quien no puede ver la imagen y lo que muestra el buscador.
          </p>
        </div>

        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
      </div>
    </div>
  )
}
