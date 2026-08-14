/**
 * Reduce el término de búsqueda a letras, números y espacios antes de interpolarlo
 * en un filtro `or()` de PostgREST.
 *
 * NO es cosmético. PostgREST separa `or=(...)` por comas de primer nivel, así que
 * `q = "zzz,costo.gt.40,marca.ilike.zzz"` inyecta un filtro real sobre la columna
 * `costo` y convierte la búsqueda en un oráculo: variando el umbral se recupera el
 * costo de cada producto por búsqueda binaria, sin que el campo aparezca nunca en
 * la respuesta. Comprobado contra la base de producción.
 *
 * Se usa una lista blanca (letras Unicode, dígitos y espacio) en vez de una lista
 * negra: una lista negra olvida siempre algún metacarácter.
 */
export function sanitizarBusqueda(q: string): string {
  return q
    .normalize('NFC')
    .replace(/[^\p{L}\p{N} ]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 60)
}
