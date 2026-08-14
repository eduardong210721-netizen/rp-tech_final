import 'server-only'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Cliente ligado a la sesión del navegador vía cookies. Usa la ANON key,
 * no la service_role: solo sirve para saber QUIÉN es el usuario.
 * Las lecturas y escrituras de datos siguen pasando por supabaseAdmin().
 */
export async function createSupabaseServerClient(): Promise<SupabaseClient> {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (nuevas) => {
          try {
            nuevas.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch {
            // Server Component: no puede escribir cookies. El proxy
            // ya refrescó la sesión, así que es seguro ignorarlo.
          }
        },
      },
    },
  )
}
