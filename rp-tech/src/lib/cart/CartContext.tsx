'use client'

import { createContext, useCallback, useContext, useMemo, useState, useSyncExternalStore } from 'react'
import { addLine, cartTotal, removeLine, setQty, type CartLine } from './cart'

const STORAGE_KEY = 'rp_cart_v2'

// Referencia estable: useSyncExternalStore exige que getServerSnapshot()
// devuelva siempre el mismo valor (con Object.is) entre llamadas, o React
// entra en un bucle de renders ("getServerSnapshot should be cached").
const CARRITO_VACIO: CartLine[] = []

type Listener = () => void

/**
 * Almacén externo a React para el carrito (lee/escribe `localStorage`).
 *
 * Usamos `useSyncExternalStore` -el mecanismo de React pensado justo para
 * esto- en vez de `useState` + `useEffect`: en el servidor y en el primer
 * render del cliente (la pasada de hidratación) React usa
 * `getServerSnapshot` (siempre `[]`), y solo después del montaje conmuta al
 * valor real leído de `localStorage`. Así el HTML del servidor y el primer
 * render del cliente coinciden siempre -sin warning de hidratación- y no
 * hace falta un `setState` síncrono dentro de un efecto.
 */
function crearAlmacenDeCarrito() {
  let lineas: CartLine[] = CARRITO_VACIO
  let cargado = false
  const listeners = new Set<Listener>()

  function cargarDesdeStorage(): CartLine[] {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (!raw) return CARRITO_VACIO
      const parsed: unknown = JSON.parse(raw)
      return Array.isArray(parsed) ? (parsed as CartLine[]) : CARRITO_VACIO
    } catch {
      // localStorage inaccesible (modo privado) o JSON corrupto: carrito vacío.
      return CARRITO_VACIO
    }
  }

  function guardarEnStorage(valor: CartLine[]) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(valor))
    } catch {
      // almacenamiento lleno o no disponible: no bloquea la compra.
    }
  }

  return {
    subscribe(listener: Listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    getSnapshot(): CartLine[] {
      if (!cargado) {
        lineas = cargarDesdeStorage()
        cargado = true
      }
      return lineas
    },
    getServerSnapshot(): CartLine[] {
      return CARRITO_VACIO
    },
    /** Reemplaza el carrito, persiste y notifica a los suscriptores de React. */
    set(nuevas: CartLine[]) {
      lineas = nuevas
      cargado = true
      guardarEnStorage(nuevas)
      listeners.forEach((l) => l())
    },
  }
}

const almacen = crearAlmacenDeCarrito()

type CartContextValue = {
  lineas: CartLine[]
  agregar: (linea: CartLine) => void
  cambiarCantidad: (sku: string, cantidad: number) => void
  quitar: (sku: string) => void
  vaciar: () => void
  /** Suma de precio*cantidad. Solo para mostrar: el servidor recalcula al confirmar el pedido. */
  total: number
  cantidadTotal: number
  abierto: boolean
  setAbierto: (abierto: boolean) => void
}

const CartContext = createContext<CartContextValue | null>(null)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const lineas = useSyncExternalStore(almacen.subscribe, almacen.getSnapshot, almacen.getServerSnapshot)
  const [abierto, setAbierto] = useState(false)

  const agregar = useCallback((linea: CartLine) => {
    almacen.set(addLine(almacen.getSnapshot(), linea))
    setAbierto(true)
  }, [])

  const cambiarCantidad = useCallback((sku: string, cantidad: number) => {
    almacen.set(setQty(almacen.getSnapshot(), sku, cantidad))
  }, [])

  const quitar = useCallback((sku: string) => {
    almacen.set(removeLine(almacen.getSnapshot(), sku))
  }, [])

  const vaciar = useCallback(() => almacen.set(CARRITO_VACIO), [])

  const total = useMemo(() => cartTotal(lineas), [lineas])
  const cantidadTotal = useMemo(
    () => lineas.reduce((suma, l) => suma + l.cantidad, 0),
    [lineas],
  )

  const value = useMemo<CartContextValue>(
    () => ({ lineas, agregar, cambiarCantidad, quitar, vaciar, total, cantidadTotal, abierto, setAbierto }),
    [lineas, agregar, cambiarCantidad, quitar, vaciar, total, cantidadTotal, abierto],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart debe usarse dentro de <CartProvider>')
  return ctx
}
