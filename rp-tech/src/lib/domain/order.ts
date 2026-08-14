import { z } from 'zod'

/**
 * Lo ÚNICO que el cliente puede enviar por item es qué y cuánto.
 * El precio se lee de la base en crear_pedido. Cualquier `precio` que
 * llegue en el body se descarta aquí (Zod hace strip por defecto).
 */
export const cartItemSchema = z.object({
  sku: z.string().trim().min(1).max(32),
  cantidad: z.number().int().positive().max(999),
})

export type CartItem = z.infer<typeof cartItemSchema>

const telefonoPeru = z
  .string()
  .transform((v) => v.replace(/\D/g, ''))
  .refine((v) => /^9\d{8}$/.test(v), {
    message: 'Ingresa un celular peruano de 9 dígitos que empiece con 9',
  })

export const checkoutSchema = z.object({
  cliente_nombre: z.string().trim().min(2, 'Ingresa tu nombre').max(120),
  cliente_telefono: telefonoPeru,
  distrito: z.string().trim().min(2, 'Ingresa tu distrito').max(80),
  referencia: z.string().trim().max(300).optional().nullable(),
  items: z
    .array(cartItemSchema)
    .min(1, 'Tu carrito está vacío')
    .max(50)
    .refine(
      (items) => new Set(items.map((i) => i.sku)).size === items.length,
      { message: 'Hay productos repetidos en el carrito' },
    ),
})

export type CheckoutInput = z.infer<typeof checkoutSchema>

/**
 * Traduce las excepciones que lanza la función SQL `crear_pedido` a un mensaje
 * que el cliente entienda. Formato: 'STOCK_INSUFICIENTE:<sku>:<quedan>'.
 * Postgres antepone un código ('P0001: ...'), por eso se usa regex y no igualdad.
 * Ante un error desconocido devuelve un texto genérico: nunca se filtra el
 * mensaje crudo de la base al navegador.
 */
export function mensajeDeError(raw: string): string {
  const stock = /STOCK_INSUFICIENTE:([^:\s]+):(\d+)/.exec(raw)
  if (stock) {
    const sku = stock[1]!
    const quedan = stock[2]!
    return quedan === '0'
      ? `Se agotó uno de los productos de tu carrito (SKU ${sku}). Quítalo para continuar.`
      : `Solo quedan ${quedan} unidades del producto ${sku}. Ajusta la cantidad.`
  }

  const noDisponible = /PRODUCTO_NO_DISPONIBLE:([^:\s]+)/.exec(raw)
  if (noDisponible) {
    return `El producto ${noDisponible[1]} ya no está disponible. Quítalo del carrito.`
  }

  if (raw.includes('PEDIDO_VACIO')) return 'Tu carrito está vacío.'
  if (raw.includes('CANTIDAD_INVALIDA')) return 'Hay una cantidad inválida en tu carrito.'
  if (raw.includes('PEDIDO_DEMASIADO_GRANDE')) return 'Tu carrito tiene demasiados productos distintos.'

  return 'No pudimos registrar tu pedido. Intenta de nuevo en un momento.'
}
