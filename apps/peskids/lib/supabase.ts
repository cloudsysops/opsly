import { createClient } from '@supabase/supabase-js'
import { Database } from './types'

function createServerClient(token?: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Missing Supabase server env: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (Doppler prd)'
    )
  }

  const globalHeaders: Record<string, string> = {}
  if (token) {
    globalHeaders.authorization = `Bearer ${token}`
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: Object.keys(globalHeaders).length > 0 ? { headers: globalHeaders } : undefined,
  })
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
