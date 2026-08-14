export type CartLine = {
  sku: string
  slug: string
  nombre: string
  precio: number
  imagen: string | null
  cantidad: number
  /** unidades disponibles; null = bajo pedido, sin tope */
  maximo: number | null
}

function recortar(cantidad: number, maximo: number | null): number {
  if (maximo === null) return cantidad
  return Math.min(cantidad, maximo)
}

export function addLine(lineas: CartLine[], nueva: CartLine): CartLine[] {
  const existente = lineas.find((l) => l.sku === nueva.sku)
  if (!existente) return [...lineas, { ...nueva, cantidad: recortar(nueva.cantidad, nueva.maximo) }]
  return lineas.map((l) =>
    l.sku === nueva.sku
      ? { ...l, cantidad: recortar(l.cantidad + nueva.cantidad, l.maximo) }
      : l,
  )
}

export function setQty(lineas: CartLine[], sku: string, cantidad: number): CartLine[] {
  if (cantidad <= 0) return removeLine(lineas, sku)
  return lineas.map((l) => (l.sku === sku ? { ...l, cantidad: recortar(cantidad, l.maximo) } : l))
}

export function removeLine(lineas: CartLine[], sku: string): CartLine[] {
  return lineas.filter((l) => l.sku !== sku)
}

export function cartTotal(lineas: CartLine[]): number {
  return lineas.reduce((suma, l) => suma + l.precio * l.cantidad, 0)
}
