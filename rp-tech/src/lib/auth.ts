import 'server-only'
import { redirect } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { esAdminPermitido } from '@/lib/domain/adminAccess'

/**
 * `ADMIN_EMAILS` es una lista blanca, no `NEXT_PUBLIC_`: si llevara ese
 * prefijo, Next.js la incluiría en el bundle que se descarga el navegador de
 * cualquier visitante, publicando quién administra la tienda.
 *
 * Se lee una sola vez al cargar el módulo, no en cada request: si falta o
 * está vacía es un error de despliegue, no una condición normal de request.
 * Nunca hay una lista por defecto que "falle abierto" -sin esta variable,
 * NADIE entra, ni siquiera un usuario válido de Supabase Auth-.
 */
function leerAdminEmails(): string {
  const valor = process.env.ADMIN_EMAILS
  if (!valor || !valor.trim()) {
    throw new Error(
      'Falta ADMIN_EMAILS (o está vacía). Por seguridad, sin esta variable ' +
        'nadie puede entrar a /admin: no hay una lista de administradores por defecto.',
    )
  }
  return valor
}

/**
 * Única puerta al panel. Se llama al inicio de CADA página y CADA Server Action
 * de admin. El proxy es solo una primera barrera: la autorización real
 * se verifica aquí, junto al dato. Nunca confíes solo en el proxy.
 *
 * Usa getUser(), NUNCA getSession(): getSession() lee la cookie sin
 * verificarla contra Supabase y es falsificable.
 *
 * Estar autenticado en Supabase Auth NO basta: el registro público está
 * abierto en este proyecto (`disable_signup: false`), así que cualquiera con
 * la anon key -pública por diseño- puede crear una cuenta y confirmarla.
 * `ADMIN_EMAILS` es lo único que separa "tiene sesión" de "es admin".
 */
export async function requireAdmin(): Promise<User> {
  const db = await createSupabaseServerClient()
  const {
    data: { user },
  } = await db.auth.getUser()
  if (!user) redirect('/admin/login')

  const adminEmailsRaw = leerAdminEmails()

  if (!esAdminPermitido(user.email, adminEmailsRaw)) {
    // Cierra la sesión: un usuario autenticado pero no autorizado no debe
    // quedar con una cookie de sesión válida dando vueltas. El mensaje en
    // /admin/login es el mismo mensaje genérico del login fallido -nunca
    // reveles si la cuenta existe o si simplemente no está en la lista-.
    await db.auth.signOut()
    redirect('/admin/login?denegado=1')
  }

  return user
}
