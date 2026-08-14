import type { Nivel } from './logica'

/**
 * Cómo se ve cada nivel de stock.
 *
 * Regla que manda aquí: **el color nunca es el único portador**. Cada nivel
 * lleva SIEMPRE su etiqueta escrita al lado del punto de color, para que la
 * pantalla siga funcionando con daltonismo, en blanco y negro o con el brillo
 * al mínimo en el almacén.
 *
 * Solo dos niveles gastan color: `agotado` (danger) y `bajo` (action). `normal`
 * es deliberadamente callado — si ocho de once filas se pintan de verde, el
 * color deja de significar nada. El sistema visual pide contención y aquí paga:
 * el ojo va directo a lo que hay que reponer.
 *
 * Sobre `action` (el amarillo): el sistema lo reserva para el botón de acción
 * principal, "uno por pantalla". Esta pantalla no tiene ninguno —los controles
 * de ajuste son filete neutro— así que el amarillo está libre y es el color
 * correcto para "atención, todavía no es una emergencia". Si algún día esta
 * página gana un botón de acción amarillo, este chip tiene que cambiar.
 *
 * Todas las clases se escriben completas para que Tailwind las encuentre al
 * escanear el archivo. Nada de interpolar el nombre del token.
 */
export const NIVEL: Record<
  Nivel,
  { etiqueta: string; punto: string; chip: string; rail: string; caja: string; numero: string }
> = {
  agotado: {
    etiqueta: 'Agotado',
    punto: 'bg-danger',
    chip: 'bg-danger/10 text-danger',
    rail: 'bg-danger',
    caja: 'border-danger/40 bg-danger/5',
    numero: 'text-danger',
  },
  bajo: {
    etiqueta: 'Bajo mínimo',
    punto: 'bg-action',
    chip: 'bg-action/20 text-ink',
    rail: 'bg-action',
    caja: 'border-action/50 bg-action/5',
    numero: 'text-ink',
  },
  normal: {
    etiqueta: 'Normal',
    punto: 'bg-ok',
    chip: 'bg-paper-alt text-ink-muted',
    rail: 'bg-hairline',
    caja: 'border-hairline bg-paper-alt',
    numero: 'text-ink',
  },
  'bajo-pedido': {
    etiqueta: 'Bajo pedido',
    punto: 'bg-signal',
    chip: 'bg-signal/10 text-signal-ink',
    rail: 'bg-signal',
    caja: 'border-hairline bg-paper-alt',
    numero: 'text-ink-soft',
  },
}
