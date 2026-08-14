'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { AJUSTE_MAXIMO } from './logica'

export type ActionResult = { ok: true; nuevoStock: number } | { ok: false; error: string }

/**
 * Ajusta el stock por DELTA, nunca por valor absoluto (R2): la RPC
 * ajustar_stock hace `stock = stock + delta` dentro de un UPDATE atómico en
 * Postgres, así dos admins ajustando el mismo producto a la vez no se pisan.
 * Esta action nunca hace `update products set stock = <numero>`.
 *
 * La UI previsualiza el destino ("11 → 14") y pide confirmación en los ajustes
 * grandes, pero eso es ergonomía: la única garantía de que el stock no queda
 * negativo es la guarda `stock + p_delta >= 0` dentro de la función de la base.
 * Aquí solo se traduce esa excepción a algo que el dueño entienda.
 */
export async function ajustarStock(productId: string, delta: number): Promise<ActionResult> {
  await requireAdmin()

  if (!productId) return { ok: false, error: 'Falta el identificador del producto.' }
  if (!Number.isInteger(delta) || delta === 0) {
    return { ok: false, error: 'El ajuste debe ser un número entero distinto de cero.' }
  }
  if (Math.abs(delta) > AJUSTE_MAXIMO) {
    return { ok: false, error: `Un solo ajuste no puede mover más de ${AJUSTE_MAXIMO} unidades.` }
  }

  const { data, error } = await supabaseAdmin().rpc('ajustar_stock', {
    p_product_id: productId,
    p_delta: delta,
  })

  if (error) {
    if (error.message.includes('AJUSTE_INVALIDO')) {
      return { ok: false, error: 'Ese ajuste dejaría el stock en negativo. No se cambió nada.' }
    }
    return { ok: false, error: error.message }
  }

  revalidatePath('/')
  revalidatePath('/admin')
  revalidatePath('/admin/stock')
  return { ok: true, nuevoStock: data as number }
}
