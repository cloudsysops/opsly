import { cookies } from 'next/headers'
import type { NextRequest } from 'next/server'
import type { User } from '@supabase/supabase-js'

const FAMILY_ROLES = new Set(['family', 'parent'])

function normalize(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

function metadataRecord(meta: unknown): Record<string, unknown> {
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) {
    return {}
  }
  return meta as Record<string, unknown>
}

function extractAccessTokenFromCookies(
  requestCookies: Array<{ name: string; value: string }>
): string {
  const authCookie = requestCookies.find((cookie) => cookie.name.startsWith('sb-') && cookie.name.endsWith('-auth-token'))
  if (!authCookie?.value) return ''

  const raw = authCookie.value.trim()
  const encoded = raw.startsWith('base64-') ? raw.slice('base64-'.length) : raw

  try {
    const json = Buffer.from(encoded, 'base64').toString('utf8')
    const parsed = JSON.parse(json) as { access_token?: string }
    return typeof parsed.access_token === 'string' ? parsed.access_token.trim() : ''
  } catch {
    return ''
  }
}

async function fetchSupabaseUser(token: string): Promise<User | null> {
  const supabaseUrl = process.env.SUPABASE_URL?.trim()
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!supabaseUrl || !serviceRoleKey) return null

  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: serviceRoleKey,
      authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    return null
  }

  return (await response.json()) as User
}

export function isFamilyUser(user: User): boolean {
  const userMeta = metadataRecord(user.user_metadata)
  const appMeta = metadataRecord(user.app_metadata)
  const role = normalize(userMeta.role) || normalize(appMeta.role)
  const tenantSlug = normalize(userMeta.tenant_slug) || normalize(appMeta.tenant_slug)
  const expectedTenant = (process.env.NEXT_PUBLIC_TENANT_ID || 'peskids').trim().toLowerCase()

  if (tenantSlug && tenantSlug !== expectedTenant) {
    return false
  }

  return FAMILY_ROLES.has(role)
}

export async function validateFamilyRequest(
  req: NextRequest
): Promise<{ ok: true; user: User } | { ok: false; status: number; error: string }> {
  const authHeader = req.headers.get('authorization') || ''
  const bearer = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7).trim() : ''
  const cookieAccessToken = extractAccessTokenFromCookies(req.cookies.getAll())
  const token = bearer || cookieAccessToken

  if (!token) {
    return { ok: false, status: 401, error: 'Unauthorized' }
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.SUPABASE_URL) {
    return { ok: false, status: 503, error: 'Family auth not configured' }
  }

  try {
    const user = await fetchSupabaseUser(token)
    if (!user) {
      return { ok: false, status: 401, error: 'Unauthorized' }
    }
    if (!isFamilyUser(user)) {
      return { ok: false, status: 403, error: 'Forbidden' }
    }

    return { ok: true, user }
  } catch {
    return { ok: false, status: 401, error: 'Unauthorized' }
  }
}

export async function validateFamilySession(): Promise<
  { ok: true; user: User } | { ok: false; status: number; error: string }
> {
  const cookieStore = await cookies()
  const authHeaderToken = extractAccessTokenFromCookies(
    cookieStore.getAll().map((cookie) => ({ name: cookie.name, value: cookie.value }))
  )

  if (!authHeaderToken) {
    return { ok: false, status: 401, error: 'Unauthorized' }
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.SUPABASE_URL) {
    return { ok: false, status: 503, error: 'Family auth not configured' }
  }

  try {
    const user = await fetchSupabaseUser(authHeaderToken)
    if (!user) {
      return { ok: false, status: 401, error: 'Unauthorized' }
    }
    if (!isFamilyUser(user)) {
      return { ok: false, status: 403, error: 'Forbidden' }
    }

    return { ok: true, user }
  } catch {
    return { ok: false, status: 401, error: 'Unauthorized' }
  }
}
