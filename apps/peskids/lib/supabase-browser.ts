import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './types'

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const fallbackUrl = url || 'https://placeholder.supabase.co'
  const fallbackAnon = anon || 'placeholder'

  return createBrowserClient<Database>(fallbackUrl, fallbackAnon, {
    auth: {
      detectSessionInUrl: true,
      flowType: 'pkce',
      experimental: { passkey: true },
    },
  })
}
