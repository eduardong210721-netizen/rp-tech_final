'use server'

import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { ERROR_GENERICO } from '@/lib/domain/adminAccess'

export type LoginResult = { ok: false; error: string }

// Mensaje único ante cualquier fallo: nunca revelar si el correo existe o
// si fue la contraseña la que estuvo mal. Distinguir el motivo del rechazo
// es justo lo que le regala información gratis a quien intenta adivinar.
// Vive en @/lib/domain/adminAccess (no aquí) porque un archivo 'use server'
// solo puede exportar funciones async -exportar una constante desde este
// módulo rompe el build-, y requireAdmin() (@/lib/auth) necesita el MISMO
// texto para cuando un usuario autenticado no está en ADMIN_EMAILS: si
// dijera algo distinto ("no autorizado" vs. "credenciales inválidas"), eso
// ya revelaría que la cuenta existe y solo le falta el permiso.

export async function loginAction(input: unknown): Promise<LoginResult> {
  if (
    typeof input !== 'object' ||
    input === null ||
    !('email' in input) ||
    !('password' in input) ||
    typeof (input as { email: unknown }).email !== 'string' ||
    typeof (input as { password: unknown }).password !== 'string'
  ) {
    return { ok: false, error: ERROR_GENERICO }
  }

  const { email, password } = input as { email: string; password: string }
  if (!email.trim() || !password) {
    return { ok: false, error: ERROR_GENERICO }
  }

  const db = await createSupabaseServerClient()
  const { error } = await db.auth.signInWithPassword({ email: email.trim(), password })

  if (error) return { ok: false, error: ERROR_GENERICO }

  redirect('/admin')
}
