'use client'

import { useState, useTransition } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { imageUrl } from '@/lib/images'
import { ALT_MAX, MAX_IMAGENES } from '@/lib/domain/imagen'
import SelectorFoto from './SelectorFoto'
import {
  subirImagen,
  eliminarImagen,
  marcarPrincipal,
  moverImagen,
  guardarAlt,
} from './imagenes-actions'

/**
 * Forma mínima que necesita la galería. No se reutiliza el tipo del repo a
 * propósito: ese módulo es `server-only` y esto corre en el navegador.
 */
export type ImagenGaleria = {
  id: string
  storage_path: string
  alt: string
  es_principal: boolean
}

/**
 * La galería de un producto: subir, reordenar, elegir la principal y quitar.
 *
 * Se muestra en el MISMO orden que la ficha pública: la principal primero y
 * el resto por su orden. Lo que el dueño ve aquí es lo que verá el cliente en
 * la tarjeta, en la ficha, en el carrito y en la vista previa de WhatsApp.
 */
export default function GaleriaImagenes({
  productId,
  imagenes,
}: {
  productId: string
  imagenes: ImagenGaleria[]
}) {
  const router = useRouter()
  const [pendiente, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [archivo, setArchivo] = useState<File | null>(null)
  const [altNuevo, setAltNuevo] = useState('')
  const [altsEditados, setAltsEditados] = useState<Record<string, string>>({})

  const noPrincipales = imagenes.filter((i) => !i.es_principal)
  const lleno = imagenes.length >= MAX_IMAGENES

  function ejecutar(accion: () => Promise<{ ok: true } | { ok: false; error: string }>) {
    setError(null)
    startTransition(async () => {
      const resultado = await accion()
      if (!resultado.ok) {
        setError(resultado.error)
        return
      }
      router.refresh()
    })
  }

  function onSubir() {
    if (!archivo) {
      setError('Elige una imagen.')
      return
    }
    setError(null)
    startTransition(async () => {
      const datos = new FormData()
      datos.set('archivo', archivo)
      datos.set('alt', altNuevo)

      const resultado = await subirImagen(productId, datos)
      if (!resultado.ok) {
        setError(resultado.error)
        return
      }
      setArchivo(null)
      setAltNuevo('')
      router.refresh()
    })
  }

  function onQuitar(imagen: ImagenGaleria) {
    const aviso = imagen.es_principal
      ? '¿Quitar la foto principal? Si el producto tiene otras, la siguiente pasará a serlo.'
      : '¿Quitar esta foto? Se borra también del almacenamiento.'
    if (!window.confirm(aviso)) return
    ejecutar(() => eliminarImagen(imagen.id))
  }

  return (
    <section aria-labelledby="galeria-titulo" className="rounded-2xl border border-hairline bg-paper p-5 sm:p-6">
      <div className="mb-1 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id="galeria-titulo" className="text-heading">
          Fotos
        </h2>
        <p className="font-mono text-spec text-ink-muted">
          {imagenes.length} / {MAX_IMAGENES}
        </p>
      </div>
      <p className="mb-5 text-sm text-ink-soft">
        La primera es la principal: es la que sale en el catálogo, en la ficha, en el carrito y
        cuando compartes el producto por WhatsApp.
      </p>

      {imagenes.length === 0 ? (
        <p className="rounded-xl border border-dashed border-hairline px-4 py-8 text-center text-sm text-ink-soft">
          Este producto todavía muestra la imagen de relleno en toda la tienda.
        </p>
      ) : (
        <ul>
          {imagenes.map((imagen, indice) => {
            const altEditado = altsEditados[imagen.id]
            const altActual = altEditado ?? imagen.alt
            const sucio = altEditado !== undefined && altEditado.trim() !== imagen.alt
            const posicionEntreResto = noPrincipales.findIndex((i) => i.id === imagen.id)

            return (
              <li
                key={imagen.id}
                className="flex flex-wrap items-start gap-4 border-t border-hairline py-4 first:border-t-0 first:pt-0"
              >
                <div
                  className={`relative aspect-square w-20 shrink-0 overflow-hidden rounded-lg bg-paper-alt ${
                    imagen.es_principal ? 'border-2 border-signal' : 'border border-hairline'
                  }`}
                >
                  <Image
                    src={imageUrl(imagen.storage_path)}
                    alt={imagen.alt}
                    fill
                    sizes="80px"
                    className="object-contain p-1.5"
                  />
                </div>

                <div className="min-w-0 flex-1 space-y-2.5">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    {imagen.es_principal ? (
                      <span className="rounded-full bg-signal/10 px-2.5 py-0.5 text-xs font-medium text-signal">
                        Principal
                      </span>
                    ) : (
                      <span className="font-mono text-spec text-ink-muted">#{indice + 1}</span>
                    )}
                    <span className="truncate font-mono text-spec text-ink-muted">
                      {imagen.storage_path}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <label htmlFor={`alt-${imagen.id}`} className="sr-only">
                      Qué se ve en la foto
                    </label>
                    <input
                      id={`alt-${imagen.id}`}
                      value={altActual}
                      maxLength={ALT_MAX}
                      disabled={pendiente}
                      onChange={(e) =>
                        setAltsEditados((prev) => ({ ...prev, [imagen.id]: e.target.value }))
                      }
                      className="min-w-0 flex-1 rounded-lg border border-hairline bg-paper px-3 py-1.5 text-sm text-ink transition-colors duration-(--dur-fast) hover:border-ink-muted disabled:opacity-50 sm:max-w-md"
                    />
                    {sucio && (
                      <button
                        type="button"
                        disabled={pendiente}
                        onClick={() =>
                          ejecutar(async () => {
                            const r = await guardarAlt(imagen.id, altActual)
                            if (r.ok) {
                              setAltsEditados((prev) => {
                                const copia = { ...prev }
                                delete copia[imagen.id]
                                return copia
                              })
                            }
                            return r
                          })
                        }
                        className="rounded-full border border-ink px-3 py-1.5 text-xs text-ink transition-colors duration-(--dur-fast) hover:bg-ink hover:text-paper disabled:opacity-50"
                      >
                        Guardar texto
                      </button>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
                    {!imagen.es_principal && (
                      <button
                        type="button"
                        disabled={pendiente}
                        onClick={() => ejecutar(() => marcarPrincipal(imagen.id))}
                        className="text-ink-soft transition-colors duration-(--dur-fast) hover:text-signal disabled:opacity-50"
                      >
                        Hacer principal
                      </button>
                    )}
                    {!imagen.es_principal && noPrincipales.length > 1 && (
                      <>
                        <button
                          type="button"
                          disabled={pendiente || posicionEntreResto === 0}
                          onClick={() => ejecutar(() => moverImagen(imagen.id, 'arriba'))}
                          className="text-ink-soft transition-colors duration-(--dur-fast) hover:text-ink disabled:opacity-30"
                        >
                          Subir
                        </button>
                        <button
                          type="button"
                          disabled={pendiente || posicionEntreResto === noPrincipales.length - 1}
                          onClick={() => ejecutar(() => moverImagen(imagen.id, 'abajo'))}
                          className="text-ink-soft transition-colors duration-(--dur-fast) hover:text-ink disabled:opacity-30"
                        >
                          Bajar
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      disabled={pendiente}
                      onClick={() => onQuitar(imagen)}
                      className="text-ink-muted transition-colors duration-(--dur-fast) hover:text-danger disabled:opacity-50"
                    >
                      Quitar
                    </button>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <div className="mt-6 border-t border-hairline pt-5">
        <p className="eyebrow mb-4">Nueva foto</p>
        {lleno ? (
          <p className="text-sm text-ink-soft">
            Ya hay {MAX_IMAGENES} fotos, el máximo. Quita alguna para añadir otra.
          </p>
        ) : (
          <>
            <SelectorFoto
              idPrefijo="galeria"
              archivo={archivo}
              alt={altNuevo}
              onArchivo={setArchivo}
              onAlt={setAltNuevo}
              deshabilitado={pendiente}
            />
            <button
              type="button"
              disabled={pendiente || !archivo}
              onClick={onSubir}
              className="mt-4 rounded-full bg-ink px-5 py-2.5 text-sm text-paper transition-colors duration-(--dur-fast) hover:bg-brand disabled:cursor-not-allowed disabled:opacity-40"
            >
              {pendiente ? 'Subiendo…' : 'Añadir foto'}
            </button>
          </>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}
    </section>
  )
}
