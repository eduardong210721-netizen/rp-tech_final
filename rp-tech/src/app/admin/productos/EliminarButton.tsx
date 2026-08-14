'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { eliminarProducto } from './actions'

/**
 * Retira un producto de la tienda. No borra nada: pone `activo = false`.
 *
 * El nombre visible es "Retirar" y no "Eliminar" porque eso es literalmente lo
 * que pasa —la fila sigue ahí, con su historial de pedidos intacto, y se puede
 * volver a publicar desde su ficha—. Un botón que dice "eliminar" y no elimina
 * enseña a desconfiar del panel.
 *
 * `router.refresh()` recarga el listado conservando la URL, así que los
 * filtros que el dueño tenía puestos siguen puestos.
 */
export default function EliminarButton({ id, nombre }: { id: string; nombre: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function onClick() {
    const seguro = window.confirm(
      `¿Retirar "${nombre}" de la tienda?\n\n` +
        'Deja de verse en el catálogo público. No se borra: sus pedidos quedan intactos y ' +
        'puedes volver a publicarlo desde su ficha.',
    )
    if (!seguro) return
    setError(null)
    startTransition(async () => {
      const resultado = await eliminarProducto(id)
      if (!resultado.ok) {
        setError(resultado.error)
        return
      }
      router.refresh()
    })
  }

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className="px-1 py-2 text-sm text-ink-muted transition-colors duration-(--dur-fast) hover:text-danger disabled:cursor-not-allowed disabled:opacity-50 lg:text-xs"
      >
        {pending ? 'Retirando…' : 'Retirar'}
        <span className="sr-only"> {nombre} de la tienda</span>
      </button>
      {error && (
        <span role="alert" className="text-xs text-danger">
          {error}
        </span>
      )}
    </span>
  )
}
