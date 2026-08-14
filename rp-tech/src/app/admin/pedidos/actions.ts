'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { esEstadoValido, type OrderEstado } from './vista'

/**
 * Resultado de un cambio de estado, pensado para `useActionState`.
 *
 * Lleva `pedido` (el id) porque el formulario de cada tarjeta comparte
 * módulo: así la tarjeta puede comprobar que el mensaje que muestra es el de
 * SU pedido. Y lleva `motivo` para que la interfaz ofrezca la salida
 * correcta: cuando falla por stock, el camino es ajustar el stock o cancelar,
 * no reintentar.
 */
export type ResultadoEstado =
  | { ok: true; pedido: string; mensaje: string }
  | { ok: false; pedido: string; error: string; motivo: 'stock' | 'otro' }
  | null

function fallo(pedido: string, error: string, motivo: 'stock' | 'otro' = 'otro'): ResultadoEstado {
  return { ok: false, pedido, error, motivo }
}

const MENSAJE_OK: Record<OrderEstado, string> = {
  pendiente: '',
  confirmado: 'Pedido confirmado. El stock ya se descontó.',
  entregado: 'Pedido marcado como entregado.',
  cancelado: 'Pedido cancelado.',
}

/**
 * Cambia el estado de un pedido. Es una acción de formulario: el botón que se
 * pulsa aporta `estado` con su propio `name`/`value`, así una sola acción
 * sirve para confirmar, entregar y cancelar sin JavaScript de por medio.
 *
 * DOS transiciones tocan `products`, y ninguna lo hace desde aquí: ambas
 * delegan en una función SQL que resuelve todo en una sola transacción.
 *
 * · confirmar → `confirmar_pedido()`. Aquí es donde el stock se descuenta.
 *   Un pedido registrado no es una venta: el cliente llenó el formulario y
 *   se le abrió WhatsApp, pero puede no enviar nunca el mensaje. Descontar
 *   en ese momento congelaba inventario por intenciones. La resta ocurre
 *   cuando el dueño confirma que la venta va.
 *
 * · cancelar → `cancelar_pedido()`. Devuelve stock SOLO a las líneas que
 *   lo habían descontado (`stock_descontado`), así que cancelar un pedido
 *   que nunca se confirmó no inventa inventario.
 *
 * `entregado` no mueve stock: ya se descontó al confirmar.
 *
 * Antes este Server Action recorría los items con un loop de llamadas a
 * ajustar_stock() DESCARTANDO el resultado, y cambiaba el estado en una
 * sentencia aparte. Eso permitía tres resultados incorrectos: un fallo del
 * RPC dejaba el stock sin devolver mientras la action igual respondía
 * {ok:true} (éxito falso); un fallo a mitad de loop dejaba devolución
 * parcial con el pedido ya cancelado; y si la devolución salía bien pero el
 * UPDATE de estado fallaba, un reintento devolvía el mismo stock una segunda
 * vez. Una sola función `security definer` con la fila del pedido bajo
 * `FOR UPDATE` elimina esa clase entera: o pasa todo, o Postgres revierte la
 * transacción completa y el error llega aquí tal cual.
 */
export async function cambiarEstadoPedido(
  _anterior: ResultadoEstado,
  formData: FormData,
): Promise<ResultadoEstado> {
  await requireAdmin()

  const orderId = formData.get('orderId')
  const nuevoEstado = formData.get('estado')

  if (typeof orderId !== 'string' || !orderId) {
    return fallo('', 'Falta el identificador del pedido.')
  }
  if (!esEstadoValido(nuevoEstado)) {
    return fallo(orderId, 'Estado inválido.')
  }

  const db = supabaseAdmin()

  if (nuevoEstado === 'cancelado') {
    const { error } = await db.rpc('cancelar_pedido', { p_order_id: orderId })

    if (error) {
      if (error.message.includes('PEDIDO_YA_CANCELADO')) {
        return fallo(orderId, 'Este pedido ya estaba cancelado.')
      }
      if (error.message.includes('PEDIDO_NO_EXISTE')) {
        return fallo(orderId, 'El pedido ya no existe. Recarga la página.')
      }
      return fallo(orderId, error.message)
    }
  } else if (nuevoEstado === 'confirmado') {
    const { error } = await db.rpc('confirmar_pedido', { p_order_id: orderId })

    if (error) {
      // El caso realista: entre que el cliente pidió y el dueño confirmó, esa
      // unidad se vendió por otro canal. Hay que decir CUÁL producto y
      // CUÁNTAS quedan —un "error al confirmar" no le sirve a nadie— y dejar
      // a la vista las dos únicas salidas: reponer stock o cancelar.
      const sinStock = /STOCK_INSUFICIENTE:([^:\s]+):(\d+)/.exec(error.message)
      if (sinStock) {
        const sku = sinStock[1]!
        const quedan = Number(sinStock[2]!)
        return fallo(
          orderId,
          quedan === 0
            ? `No se pudo confirmar: el producto ${sku} está agotado (0 en stock). ` +
                'Repón el stock o cancela el pedido.'
            : `No se pudo confirmar: del producto ${sku} solo quedan ${quedan} ` +
                'en stock, menos de las unidades pedidas. Repón el stock o cancela el pedido.',
          'stock',
        )
      }
      // `confirmar_pedido()` lanza 'PEDIDO_NO_PENDIENTE:<estado>'.
      const noPendiente = /PEDIDO_NO_PENDIENTE:(\w+)/.exec(error.message)
      if (noPendiente) {
        return fallo(
          orderId,
          `Este pedido ya no está pendiente (ahora está ${noPendiente[1]!}). ` +
            'Recarga la página para ver su estado real.',
        )
      }
      if (error.message.includes('PEDIDO_NO_EXISTE')) {
        return fallo(orderId, 'El pedido ya no existe. Recarga la página.')
      }
      return fallo(orderId, error.message)
    }
  } else if (nuevoEstado === 'pendiente') {
    // Volver a pendiente es la única transición que la base NO protege, y es
    // la peligrosa: `confirmar_pedido()` descuenta todas las líneas del
    // pedido sin mirar `stock_descontado`, así que confirmar → pendiente →
    // confirmar restaría el inventario DOS veces. Si hay que deshacer una
    // confirmación, el camino correcto es cancelar (que devuelve exactamente
    // lo que se descontó) y registrar el pedido de nuevo.
    return fallo(
      orderId,
      'Un pedido no puede volver a pendiente: el stock ya se movió al confirmarlo. ' +
        'Si la venta no va, cancélalo —eso devuelve el stock descontado—.',
    )
  } else {
    // Solo queda 'entregado', y solo desde 'confirmado': entregar un pedido
    // sin confirmar dejaría la mercadería fuera y el stock intacto.
    const { data: pedido, error: pedidoErr } = await db
      .from('orders')
      .select('id, estado')
      .eq('id', orderId)
      .maybeSingle()

    if (pedidoErr) return fallo(orderId, pedidoErr.message)
    if (!pedido) return fallo(orderId, 'El pedido ya no existe. Recarga la página.')
    if (pedido.estado === 'entregado') {
      return fallo(orderId, 'Este pedido ya estaba entregado.')
    }
    if (pedido.estado !== 'confirmado') {
      return fallo(
        orderId,
        'Primero confirma el pedido: marcarlo entregado sin confirmar dejaría el stock sin descontar.',
      )
    }

    const { error } = await db
      .from('orders')
      .update({ estado: 'entregado' })
      .eq('id', orderId)
      .eq('estado', 'confirmado')
    if (error) return fallo(orderId, error.message)
  }

  // El catálogo público y el panel muestran stock: confirmar o cancelar lo
  // acaba de mover.
  revalidatePath('/')
  revalidatePath('/admin')
  revalidatePath('/admin/stock')
  revalidatePath('/admin/pedidos')

  return { ok: true, pedido: orderId, mensaje: MENSAJE_OK[nuevoEstado] }
}
