import { createClient } from '@supabase/supabase-js'
import { Database } from './types'

function createServerClient(token?: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required at runtime')
  }

  return createClient<Database>(
    supabaseUrl,
    process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        headers: {
          authorization: token ? `Bearer ${token}` : '',
        },
      },
    }
  )
}

export const supabaseServer = (token?: string) => {
  return createServerClient(token)
}

/** Alias for webhook routes (same service-role client). */
export const getServiceClient = supabaseServer

export async function getRecentMessages(tenantId: string, limit: number = 10) {
  const client = supabaseServer()
  const { data, error } = await client
    .from('messages')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching recent messages:', error)
    return []
  }

  return data || []
}
