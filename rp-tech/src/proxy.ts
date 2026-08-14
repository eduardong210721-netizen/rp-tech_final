import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

/**
 * Primera barrera antes de llegar a las páginas de /admin. NO es la
 * autorización real: eso lo hace requireAdmin() en cada página y cada
 * Server Action, junto al dato. Este proxy solo evita que una petición
 * sin sesión llegue a renderizar el panel.
 */
export async function proxy(request: NextRequest) {
  const response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (nuevas) => {
          nuevas.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // getUser() valida el JWT contra Supabase. NO uses getSession() aquí:
  // lee la cookie sin verificarla y es falsificable.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user && !request.nextUrl.pathname.startsWith('/admin/login')) {
    const url = request.nextUrl.clone()
    url.pathname = '/admin/login'
    return NextResponse.redirect(url)
  }

  return response
}

export const config = { matcher: ['/admin/:path*'] }
