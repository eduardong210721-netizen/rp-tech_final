/**
 * Mensaje único ante cualquier rechazo de acceso al panel: credenciales
 * inválidas en /admin/login O una sesión válida cuyo correo no está en
 * ADMIN_EMAILS (@/lib/auth). Un texto distinto para cada caso revelaría que
 * la cuenta existe y solo le falta el permiso -exactamente el tipo de
 * información que un mensaje genérico existe para no regalar-.
 */
export const ERROR_GENERICO = 'Correo o contraseña incorrectos'

/**
 * Compara un correo contra la lista blanca de administradores permitidos.
 * Pura y sin `server-only` a propósito -igual que mensajeDeError en
 * @/lib/domain/order-: requireAdmin() vive en un módulo con `server-only`,
 * que Vitest no puede importar, así que la lógica de comparación se extrae
 * aquí para poder testearla.
 *
 * `listaRaw` es el valor crudo de la variable de entorno `ADMIN_EMAILS`
 * ("a@x.com, b@y.com"). Una lista vacía o indefinida deniega a TODOS: nunca
 * hay una lista por defecto que "falle abierto". La comparación es exacta
 * (no substring): "notjjjeampierdel@gmail.com.evil.com" nunca coincide con
 * "jjjeampierdel@gmail.com".
 */
export function esAdminPermitido(
  email: string | null | undefined,
  listaRaw: string | null | undefined,
): boolean {
  const emailNormalizado = email?.trim().toLowerCase()
  if (!emailNormalizado) return false
  if (!listaRaw) return false

  const permitidos = listaRaw
    .split(',')
    .map((correo) => correo.trim().toLowerCase())
    .filter((correo) => correo.length > 0)

  return permitidos.includes(emailNormalizado)
}
