'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Copia un bloque de texto al portapapeles.
 *
 * El dueño coordina la entrega por WhatsApp: la dirección tiene que salir de
 * aquí en un toque, no seleccionándola con el dedo. Si el portapapeles no
 * está disponible (navegador sin permiso, o servido por http en el celular)
 * lo dice en vez de fingir que copió: el texto está a la vista y se puede
 * seleccionar a mano. Un estado de error nunca puede parecerse a un éxito.
 */
export default function CopiarTexto({ texto, etiqueta }: { texto: string; etiqueta: string }) {
  const [estado, setEstado] = useState<'listo' | 'copiado' | 'error'>('listo')
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (temporizador.current) clearTimeout(temporizador.current)
    }
  }, [])

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto)
      setEstado('copiado')
      if (temporizador.current) clearTimeout(temporizador.current)
      temporizador.current = setTimeout(() => setEstado('listo'), 2500)
    } catch {
      setEstado('error')
    }
  }

  return (
    <button
      type="button"
      onClick={copiar}
      className="inline-flex min-h-11 shrink-0 items-center rounded-full border border-hairline px-4 text-sm text-ink-soft transition-colors duration-(--dur-fast) hover:border-ink hover:text-ink"
    >
      <span aria-live="polite">
        {estado === 'copiado' ? 'Copiado' : estado === 'error' ? 'Cópialo a mano' : etiqueta}
      </span>
    </button>
  )
}
