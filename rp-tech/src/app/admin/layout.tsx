import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { NavEscritorio, NavMovil } from './NavPanel'

/**
 * Cáscara visual del panel: barra propia, navegación y botón de salir.
 *
 * NO hace la autorización — eso es trabajo de requireAdmin() en cada
 * page.tsx (junto al dato). Si lo hiciera aquí, envolvería también a
 * /admin/login (está en el mismo árbol de rutas) y crearía un loop de
 * redirects: login -> layout redirige a login -> layout redirige...
 * Por eso solo lee al usuario (sin redirigir) para decidir qué mostrar.
 *
 * /admin quedó FUERA del grupo `(tienda)`, así que aquí ya no aparecen el
 * logotipo de la tienda, los enlaces de Catálogo y Contacto ni el icono del
 * carrito. El dueño no compra en su propia tienda, y en un celular esa barra
 * de más costaba media pantalla de panel.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const db = await createSupabaseServerClient()
  const {
    data: { user },
  } = await db.auth.getUser()

  // Sin sesión: probablemente /admin/login. Se muestra sin la cáscara del
  // panel; si el usuario navegó a mano a una ruta protegida, requireAdmin()
  // dentro de esa página hará el redirect real.
  if (!user) return <>{children}</>

  async function logout() {
    'use server'
    const supabase = await createSupabaseServerClient()
    await supabase.auth.signOut()
    redirect('/admin/login')
  }

  return (
    <div className="min-h-screen bg-paper-alt">
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-ink focus:px-4 focus:py-2 focus:text-sm focus:text-paper"
      >
        Saltar al contenido
      </a>

      <header className="sticky top-0 z-30 bg-brand">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
          <div className="flex min-w-0 items-center gap-7">
            <Link
              href="/admin"
              className="shrink-0 font-mono text-spec uppercase tracking-[0.14em] text-white/60 transition-colors duration-(--dur-fast) ease-(--ease-out-soft) hover:text-white"
            >
              RP Tech · Panel
            </Link>
            <NavEscritorio />
          </div>

          <form action={logout} className="flex shrink-0 items-center gap-3">
            <span className="hidden max-w-[16ch] truncate text-xs text-white/50 lg:inline">
              {user.email}
            </span>
            <button
              type="submit"
              className="rounded-full border border-white/25 px-3.5 py-1.5 text-xs text-white/80 transition-colors duration-(--dur-fast) ease-(--ease-out-soft) hover:bg-white/10 hover:text-white"
            >
              Salir
            </button>
          </form>
        </div>
      </header>

      {/* pb-20 en móvil deja libre la barra fija de abajo: sin eso, la última
          fila de cualquier tabla queda tapada y no se puede tocar. */}
      <main id="contenido" className="mx-auto max-w-6xl px-4 pb-20 pt-6 sm:pb-14 sm:pt-10">
        {children}
      </main>

      <NavMovil />
    </div>
  )
}
