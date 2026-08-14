import { ERROR_GENERICO } from '@/lib/domain/adminAccess'
import LoginForm from './LoginForm'

/**
 * Server Component: solo lee `?denegado=1` (lo agrega requireAdmin() al
 * cerrar la sesión de un usuario autenticado que no está en ADMIN_EMAILS) y
 * lo traduce al MISMO mensaje genérico que un login fallido, para no
 * distinguir "no autorizado" de "credenciales inválidas". El formulario en
 * sí es un Client Component (LoginForm): necesita estado y useTransition.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ denegado?: string }>
}) {
  const { denegado } = await searchParams
  return <LoginForm avisoInicial={denegado === '1' ? ERROR_GENERICO : undefined} />
}
