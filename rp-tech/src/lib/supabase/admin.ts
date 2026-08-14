import 'server-only'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let cliente: SupabaseClient | null = null

/**
 * Cliente con service_role. Ignora RLS por diseño.
 * El paquete `server-only` hace que el build FALLE si un Client Component
 * intenta importar este archivo. No quites ese import.
 */
export function supabaseAdmin(): SupabaseClient {
  if (cliente) return cliente

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url) throw new Error('Falta NEXT_PUBLIC_SUPABASE_URL')
  if (!key) throw new Error('Falta SUPABASE_SERVICE_ROLE_KEY')

  cliente = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  return cliente
}
