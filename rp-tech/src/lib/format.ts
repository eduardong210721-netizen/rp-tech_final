const formatter = new Intl.NumberFormat('es-PE', {
  style: 'currency',
  currency: 'PEN',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/** Formatea un monto en soles: 15 -> "S/ 15.00" */
export function formatPEN(valor: number): string {
  // Intl produce "S/ 15.00" con espacio no separable (U+00A0); lo normalizamos
  return formatter.format(valor).replace(/\u00A0/g, ' ')
}
