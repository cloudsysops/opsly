import { supabaseServer } from '@/lib/supabase'
import { PESKIDS_APP_ORIGIN } from '@/lib/app-url'

const TENANT_SLUG = 'peskids'
const DEFAULT_FROM_EMAIL = 'Peskids <no-reply@peskids.op-sly.com>'
const FAMILY_DASHBOARD_PATH = '/familias/submissions'

type FamilyAccessEligibility = {
  email: string
  eligible: boolean
  source: 'student' | 'lead' | 'none'
}

type ResendSendResult = {
  skipped: boolean
  warning?: string
}

type FamilyAccessInviteResult = {
  accepted: boolean
  eligibility: FamilyAccessEligibility
  emailDeliverySkipped?: boolean
  emailDeliveryWarning?: string
  warning?: string
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function getFromAddress(): string {
  const inviteFrom = process.env.RESEND_FAMILY_FROM_EMAIL?.trim()
  if (inviteFrom) return inviteFrom
  const fromEmail = process.env.RESEND_FROM_EMAIL?.trim()
  if (fromEmail) return fromEmail
  return DEFAULT_FROM_EMAIL
}

function isEmailDeliverySkipped(): boolean {
  if (process.env.DISABLE_EMAIL_SEND === 'true') return true
  const mode = process.env.EMAIL_DELIVERY_MODE?.trim().toLowerCase()
  return mode === 'test' || mode === 'skip' || mode === 'off'
}

function isNonFatalEmailError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err)
  const normalized = message.toLowerCase()
  return (
    normalized.includes('only send testing emails to your own email address') ||
    normalized.includes('you can only send testing emails')
  )
}

function getPeskidsSiteUrl(): string {
  return PESKIDS_APP_ORIGIN.replace(/\/$/, '')
}

function buildFamilyInviteHtml(params: {
  displayName: string
  link: string
}): string {
  const safeDisplayName = escapeHtml(params.displayName)
  const safeLink = escapeHtml(params.link)
  const brandUrl = escapeHtml(getPeskidsSiteUrl())
  return `<!DOCTYPE html>
  <html lang="es"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>Peskids</title></head>
  <body style="margin:0;background:#eef7fb;color:#0f172a;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:linear-gradient(180deg,#e8f4fb 0%,#f7fbfd 100%);padding:40px 16px;">
      <tr><td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;background:#ffffff;border:1px solid #d7e7ef;border-radius:24px;overflow:hidden;box-shadow:0 18px 60px rgba(15,23,42,0.08);">
          <tr><td style="padding:34px 32px 24px 32px;">
            <div style="font-size:12px;letter-spacing:0.14em;text-transform:uppercase;color:#0f766e;font-weight:700;">Acceso para familias</div>
            <div style="font-size:28px;line-height:1.1;font-weight:800;color:#0f172a;margin-top:8px;">Peskids</div>
            <div style="font-size:15px;line-height:1.75;color:#334155;margin-top:16px;">
              Hola ${safeDisplayName}, tu acceso familiar ya está listo. Usa este enlace seguro para entrar al portal de familias y ver tus clases, mensajes y progreso.
            </div>
            <div style="height:26px;"></div>
            <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 auto;"><tr>
              <td align="center" bgcolor="#14b8a6" style="border-radius:999px;">
                <a href="${safeLink}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:999px;">Abrir acceso seguro</a>
              </td>
            </tr></table>
            <div style="height:18px;"></div>
            <div style="font-size:13px;line-height:1.7;color:#475569;text-align:center;">Si el botón no abre, usa este enlace: <a href="${safeLink}" style="color:#0f766e;text-decoration:none;font-weight:700;">abrir acceso</a></div>
            <div style="height:22px;"></div>
            <div style="padding:18px 20px;border-radius:18px;background:#f8fcfd;border:1px solid #d6eef0;">
              <div style="font-size:13px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;color:#0f766e;">Recomendación</div>
              <ol style="margin:12px 0 0 18px;padding:0;font-size:14px;line-height:1.8;color:#334155;">
                <li>Abre el enlace desde el correo autorizado.</li>
                <li>Si no esperabas este acceso, ignóralo.</li>
                <li>Para soporte usa el portal de familias en <a href="${brandUrl}/familias" style="color:#0f766e;text-decoration:none;font-weight:700;">${brandUrl}/familias</a>.</li>
              </ol>
            </div>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body></html>`
}

async function sendResendEmail(params: {
  to: string
  subject: string
  html: string
}): Promise<ResendSendResult> {
  if (isEmailDeliverySkipped()) {
    return { skipped: true, warning: 'EMAIL_DELIVERY_MODE=test (no Resend send)' }
  }

  const apiKey = process.env.RESEND_API_KEY?.trim()
  if (!apiKey) {
    return { skipped: true, warning: 'Missing RESEND_API_KEY; family invite link created but email not sent' }
  }

  const from = getFromAddress()
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: params.to,
        subject: params.subject,
        html: params.html,
      }),
    })

    const text = await response.text()
    if (!response.ok) {
      if (isNonFatalEmailError(new Error(text))) {
        return { skipped: true, warning: text || 'Family invite email skipped by provider' }
      }
      return { skipped: true, warning: text || `Email delivery failed with status ${response.status}` }
    }

    return { skipped: false }
  } catch (err) {
    return {
      skipped: true,
      warning: err instanceof Error ? err.message : 'Email provider unavailable; family invite link created',
    }
  }
}

async function getPlatformClient(): Promise<ReturnType<typeof supabaseServer>> {
  return supabaseServer() as ReturnType<typeof supabaseServer>
}

export async function resolveFamilyAccessEligibility(email: string): Promise<FamilyAccessEligibility> {
  const normalized = email.trim().toLowerCase()
  if (!normalized) {
    return { email: '', eligible: false, source: 'none' }
  }

  const client = (await getPlatformClient()) as any
  const platform = client.schema('platform') as any
  const tenantId = (process.env.NEXT_PUBLIC_TENANT_ID || TENANT_SLUG).trim()

  const { data: studentRows, error: studentError } = await platform
    .from('students')
    .select('id')
    .eq('tenant_id', tenantId)
    .ilike('parent_email', normalized)
    .limit(1)

  if (!studentError && Array.isArray(studentRows) && studentRows.length > 0) {
    return { email: normalized, eligible: true, source: 'student' }
  }

  const { data: leadRows, error: leadError } = await platform
    .from('leads')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('email', normalized)
    .eq('status', 'enrolled')
    .limit(1)

  if (!leadError && Array.isArray(leadRows) && leadRows.length > 0) {
    return { email: normalized, eligible: true, source: 'lead' }
  }

  return { email: normalized, eligible: false, source: 'none' }
}

async function createFamilyAccessLink(params: {
  email: string
  name: string
}): Promise<{ link: string }> {
  const admin = supabaseServer()
  const { data, error } = await (admin.auth.admin.generateLink as any)({
    type: 'magiclink',
    email: params.email,
    options: {
      data: {
        full_name: params.name,
        tenant_slug: TENANT_SLUG,
        role: 'family',
      },
      redirectTo: `${getPeskidsSiteUrl()}/auth/callback?next=${encodeURIComponent(FAMILY_DASHBOARD_PATH)}`,
    },
  })

  if (error) {
    throw new Error(error.message)
  }

  const actionLink = data.properties?.action_link
  if (!actionLink) {
    throw new Error('generateLink did not return action_link')
  }

  return {
    link: actionLink,
  }
}

export async function requestFamilyAccessInvite(params: {
  email: string
  name?: string | null
}): Promise<FamilyAccessInviteResult> {
  const email = params.email.trim().toLowerCase()
  const displayName = params.name?.trim() || email.split('@')[0] || 'Familia'
  const eligibility = await resolveFamilyAccessEligibility(email)

  if (!eligibility.eligible) {
    return { accepted: true, eligibility }
  }

  const authLink = await createFamilyAccessLink({
    email,
    name: displayName,
  })

  const sendResult = await sendResendEmail({
    to: email,
    subject: 'Tu acceso al portal de familias de Peskids',
    html: buildFamilyInviteHtml({
      displayName,
      link: authLink.link,
    }),
  })

  return {
    accepted: true,
    eligibility,
    ...(sendResult.skipped
      ? {
          emailDeliverySkipped: true,
          emailDeliveryWarning: sendResult.warning,
        }
      : {}),
  }
}
