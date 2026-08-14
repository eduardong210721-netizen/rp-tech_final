import { formatPEN } from '@/lib/format'

export type PedidoConfirmado = {
  codigo: string
  cliente_nombre: string
  cliente_telefono: string
  distrito: string
  referencia: string | null
  subtotal: number
  items: { sku: string; nombre: string; precio_unitario: number; cantidad: number }[]
}

const NUMERO = process.env.NEXT_PUBLIC_WHATSAPP ?? '51935423395'

export function buildWhatsAppMessage(p: PedidoConfirmado): string {
  const lineas = p.items.map(
    (i) => `• ${i.cantidad} x ${i.nombre} — ${formatPEN(i.precio_unitario * i.cantidad)}`,
  )

  return [
    `*Pedido ${p.codigo}* — RP Tech`,
    '',
    ...lineas,
    '',
    `*Total: ${formatPEN(p.subtotal)}*`,
    '',
    `Cliente: ${p.cliente_nombre}`,
    `Celular: ${p.cliente_telefono}`,
    `Distrito: ${p.distrito}`,
    ...(p.referencia ? [`Referencia: ${p.referencia}`] : []),
    '',
    'Confirmo mi pedido. ¿Cómo coordinamos el pago y la entrega?',
  ].join('\n')
}

export function whatsappUrl(mensaje: string): string {
  return `https://wa.me/${NUMERO}?text=${encodeURIComponent(mensaje)}`
}
