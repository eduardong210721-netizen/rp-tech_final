'use client'

import { useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import FilaStock from './FilaStock'
import { ajustarStock } from './actions'
import {
  formatearDelta,
  interpretarAjuste,
  limitarDelta,
  type ItemStock,
} from './logica'

type Mensaje = { delta: number; nuevo: number }

/** El ajuste a medio escribir. Uno solo: ver la decisión 1. */
type Borrador = { id: string; nombre: string; delta: number; texto: string }

/**
 * Dueña del estado compartido de la lista.
 *
 * Cuatro decisiones viven aquí:
 *
 * 1. **Solo una fila en edición.** `borrador` es un único ajuste. Dos ajustes a
 *    medias en pantalla es la receta para aplicar el número de un producto al
 *    otro, que es literalmente la queja del dueño.
 *
 * 2. **El borrador es de la LISTA, no de la fila.** Desde que los filtros se
 *    aplican solos al escribir, la fila que estás ajustando puede salir de la
 *    lista a mitad de palabra. Si el número viviera en `FilaStock`, ese
 *    desmontaje se lo llevaría en silencio: una pérdida de datos que nadie ve.
 *    Viviendo aquí sobrevive —esta lista no se desmonta al filtrar, sólo
 *    recibe otros `items`— y además podemos avisar de que sigue ahí.
 *
 * 3. **El valor nuevo se ve sin recargar.** `optimista` guarda el stock que
 *    devolvió la RPC —el valor real de la base, no una suma hecha aquí— y se
 *    limpia solo cuando el servidor vuelve a renderizar con datos frescos.
 *
 * 4. **Nada de reordenar.** Esta lista pinta `items` en el orden en que llegan
 *    (SKU ascendente). No hay un solo `sort` en este archivo, y no debe haberlo:
 *    si la fila salta al ajustar, se pierde el sitio y se mete un dato malo.
 *
 * Por eso también se pinta desde aquí el "ningún producto coincide": si ese
 * cartel lo pusiera la página, filtrar hasta cero resultados desmontaría la
 * lista y con ella el borrador, que es justo lo que la decisión 2 evita.
 */
export default function ListaStock({ items }: { items: ItemStock[] }) {
  const router = useRouter()
  const [borrador, setBorrador] = useState<Borrador | null>(null)
  const [optimista, setOptimista] = useState<Record<string, number>>({})
  const [mensajes, setMensajes] = useState<Record<string, Mensaje>>({})
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [aplicandoId, setAplicandoId] = useState<string | null>(null)
  const [anuncio, setAnuncio] = useState('')
  const [, startTransition] = useTransition()

  /* Un doble clic en "Aplicar" no puede lanzar dos RPC: serían dos deltas. El
     `disabled` llega un render tarde; el candado es síncrono. */
  const enviando = useRef(false)

  /* `items` sólo cambia de identidad cuando el servidor vuelve a renderizar
     (router.refresh, o un cambio de filtro). En ese momento las props ya traen
     la verdad y el valor optimista sobra: si otra sesión tocó el stock, gana la
     base. El borrador NO se toca aquí — ver la decisión 2.

     Se ajusta durante el render, no en un efecto: un `useEffect` que llama a
     setState provoca un render en cascada y el número parpadearía. */
  const [itemsVistos, setItemsVistos] = useState(items)
  if (items !== itemsVistos) {
    setItemsVistos(items)
    setOptimista({})
  }

  function stockDe(item: ItemStock): number {
    return optimista[item.id] ?? item.stock
  }

  function limpiarAvisos(id: string) {
    setMensajes((previo) => {
      const copia = { ...previo }
      delete copia[id]
      return copia
    })
    setErrores((previo) => {
      const copia = { ...previo }
      delete copia[id]
      return copia
    })
  }

  /* Los atajos suman sobre lo que ya hay escrito, y activan la fila si hacía
     falta: pulsar "+1" en una fila dormida es una forma legítima de empezar. */
  function atajo(item: ItemStock, paso: number) {
    const stock = stockDe(item)
    setBorrador((previo) => {
      const base = previo && previo.id === item.id ? previo.delta : 0
      const delta = limitarDelta(stock, base + paso)
      return { id: item.id, nombre: item.nombre, delta, texto: formatearDelta(delta) }
    })
    limpiarAvisos(item.id)
  }

  function escribir(item: ItemStock, valor: string) {
    const { delta, texto } = interpretarAjuste(stockDe(item), valor)
    setBorrador({ id: item.id, nombre: item.nombre, delta, texto })
    limpiarAvisos(item.id)
  }

  function aplicar(item: ItemStock, delta: number) {
    if (enviando.current) return
    enviando.current = true
    setAplicandoId(item.id)
    setErrores((previo) => {
      const copia = { ...previo }
      delete copia[item.id]
      return copia
    })

    startTransition(async () => {
      const resultado = await ajustarStock(item.id, delta)
      enviando.current = false
      setAplicandoId(null)

      if (!resultado.ok) {
        setErrores((previo) => ({ ...previo, [item.id]: resultado.error }))
        setAnuncio(`Error en ${item.nombre}: ${resultado.error}`)
        return
      }

      setOptimista((previo) => ({ ...previo, [item.id]: resultado.nuevoStock }))
      setMensajes((previo) => ({
        ...previo,
        [item.id]: { delta, nuevo: resultado.nuevoStock },
      }))
      setBorrador(null)
      setAnuncio(
        `${item.nombre}: ajuste ${formatearDelta(delta)} aplicado, quedó en ${resultado.nuevoStock} unidades.`,
      )
      router.refresh()
    })
  }

  /* El ajuste sigue vivo pero su fila no está en pantalla: lo dice, no lo
     esconde. Un número escrito que desaparece sin explicación es exactamente
     la pérdida silenciosa que esta pantalla existe para evitar. */
  const escondido =
    borrador && borrador.delta !== 0 && !items.some((item) => item.id === borrador.id)
      ? borrador
      : null

  const aviso = escondido && (
    <p className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-card border border-signal/40 bg-signal/5 px-4 py-3 text-sm text-ink">
      <span>
        Tienes un ajuste sin aplicar en <span className="font-medium">{escondido.nombre}</span> (
        <span className="font-mono tabular-nums">{formatearDelta(escondido.delta)}</span>). No se
        perdió: quita el filtro y sigue ahí.
      </span>
      <button
        type="button"
        onClick={() => setBorrador(null)}
        className="text-ink-soft underline decoration-hairline underline-offset-4 transition-colors duration-(--dur-fast) hover:text-ink hover:decoration-ink"
      >
        Descartarlo
      </button>
    </p>
  )

  if (items.length === 0) {
    return (
      <>
        {aviso}
        <div className="rounded-card border border-dashed border-hairline px-6 py-16 text-center">
          <p className="text-ink">Ningún producto coincide con estos filtros.</p>
          <Link
            href="/admin/stock"
            className="mt-6 inline-block text-sm text-ink underline decoration-hairline underline-offset-4 transition-colors duration-(--dur-fast) hover:decoration-ink"
          >
            Quitar filtros
          </Link>
        </div>
      </>
    )
  }

  return (
    <>
      {aviso}

      <ul className="space-y-3">
        {items.map((item) => {
          const suyo = borrador?.id === item.id ? borrador : null
          return (
            <FilaStock
              key={item.id}
              item={item}
              stockVisible={stockDe(item)}
              activa={suyo !== null}
              delta={suyo?.delta ?? 0}
              texto={suyo?.texto ?? '0'}
              aplicando={aplicandoId === item.id}
              mensaje={mensajes[item.id] ?? null}
              error={errores[item.id] ?? null}
              onAtajo={(paso) => atajo(item, paso)}
              onEscribir={(valor) => escribir(item, valor)}
              onAplicar={(delta) => aplicar(item, delta)}
              onCerrar={() => setBorrador(null)}
            />
          )
        })}
      </ul>

      {/* El resultado también se anuncia a un lector de pantalla: en la fila se
          ve, pero quien no mira la fila necesita oírlo. */}
      <p role="status" aria-live="polite" className="sr-only">
        {anuncio}
      </p>
    </>
  )
}
