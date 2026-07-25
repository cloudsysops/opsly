import { supabaseServer } from '@/lib/supabase';
import { getPeskidsPublicBaseUrl } from '@/lib/app-url';

const TENANT_SLUG = 'peskids';
const DEFAULT_OWNER_EMAIL = 'peskidsnatacion@gmail.com';

export type TeamRole = 'owner' | 'admin' | 'support' | 'teacher';
export type TeamMemberStatus = 'invited' | 'active' | 'disabled';
export type TeamInviteFlow = 'invite' | 'recovery';

export type TeamMemberSummary = {
  id: string;
  email: string;
  role: TeamRole;
  status: TeamMemberStatus;
  invited_by: string | null;
  user_id: string | null;
  display_name: string | null;
  created_at: string;
  updated_at: string;
};

export type TeamViewData = {
  tenant_slug: string;
  tenant_name: string;
  owner_email: string;
  members: TeamMemberSummary[];
  warnings: string[];
};

export type TeamInviteResult = {
  ok: true;
  flow: TeamInviteFlow;
  link: string;
  token: string;
  emailDeliverySkipped?: boolean;
  emailDeliveryWarning?: string;
  warning?: string;
  member: TeamMemberSummary;
};

export type TeamRecoveryRequestResult = {
  accepted: boolean;
  matched: boolean;
  emailDeliverySkipped?: boolean;
  emailDeliveryWarning?: string;
  warning?: string;
};

type TenantRow = {
  id: string;
  slug: string;
  name: string | null;
  owner_email: string | null;
};

type TenantMembershipRow = {
  id: string;
  email: string;
  role: TeamRole;
  status: TeamMemberStatus;
  invited_by: string | null;
  user_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function isEmailDeliverySkipped(): boolean {
  if (process.env.DISABLE_EMAIL_SEND === 'true') return true;
  const mode = process.env.EMAIL_DELIVERY_MODE?.trim().toLowerCase();
  return mode === 'test' || mode === 'skip' || mode === 'off';
}

function isNonFatalEmailError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  const normalized = message.toLowerCase();
  return (
    normalized.includes('only send testing emails to your own email address') ||
    normalized.includes('you can only send testing emails')
  );
}

function getPeskidsSiteUrl(): string {
  return getPeskidsPublicBaseUrl().replace(/\/$/, '');
}

function getLogoUrl(): string {
  return `${getPeskidsSiteUrl()}/brand/logo-reference.png`;
}

function getFromAddress(): string {
  const inviteFrom = process.env.RESEND_INVITE_FROM_EMAIL?.trim();
  if (inviteFrom) return inviteFrom;
  const fromEmail = process.env.RESEND_FROM_EMAIL?.trim();
  if (fromEmail) return fromEmail;
  const fromAddress = process.env.RESEND_FROM_ADDRESS?.trim();
  if (fromAddress) return fromAddress;
  throw new Error(
    'Missing required environment variable: RESEND_INVITE_FROM_EMAIL or RESEND_FROM_EMAIL'
  );
}

async function sendTeamEmail(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ skipped: boolean; warning?: string }> {
  if (isEmailDeliverySkipped()) {
    return { skipped: true, warning: 'EMAIL_DELIVERY_MODE=test (no Resend send)' };
  }

  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    return {
      skipped: true,
      warning: 'Missing RESEND_API_KEY; invite link created but email not sent',
    };
  }

  let from: string;
  try {
    from = getFromAddress();
  } catch (err) {
    return {
      skipped: true,
      warning:
        err instanceof Error
          ? err.message
          : 'Missing sender address; invite link created but email not sent',
    };
  }

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
    });

    const text = await response.text();
    if (!response.ok) {
      if (isNonFatalEmailError(new Error(text))) {
        return { skipped: true, warning: text || 'Email delivery skipped (provider restriction)' };
      }
      return {
        skipped: true,
        warning: text || `Email delivery failed with status ${response.status}`,
      };
    }

    return { skipped: false };
  } catch (err) {
    return {
      skipped: true,
      warning:
        err instanceof Error ? err.message : 'Email provider unavailable; invite link created',
    };
  }
}

async function getPlatformClient(): Promise<ReturnType<typeof supabaseServer>> {
  return supabaseServer() as ReturnType<typeof supabaseServer>;
}

async function resolveAuthUserIdByEmail(email: string): Promise<string | null> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;

  try {
    const admin = await getPlatformClient();
    const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (error) return null;

    const match = data.users.find((user) => user.email?.trim().toLowerCase() === normalized);
    return match?.id ?? null;
  } catch {
    return null;
  }
}

async function resolveTenantRow(): Promise<{ tenant: TenantRow | null; warnings: string[] }> {
  const warnings: string[] = [];
  try {
    const client = (await getPlatformClient()) as any;
    const platform = client.schema('platform') as any;
    const { data, error } = await platform
      .from('tenants')
      .select('id, slug, name, owner_email')
      .eq('slug', TENANT_SLUG)
      .is('deleted_at', null)
      .maybeSingle();

    if (error) {
      warnings.push(error.message || 'tenant lookup failed');
      return { tenant: null, warnings };
    }

    if (!data) {
      warnings.push('Peskids tenant row not found; using fallback owner email');
      return { tenant: null, warnings };
    }

    return { tenant: data as TenantRow, warnings };
  } catch (err) {
    warnings.push(err instanceof Error ? err.message : 'Tenant lookup failed');
    return { tenant: null, warnings };
  }
}

function membershipFromRow(row: TenantMembershipRow): TeamMemberSummary {
  const metadata = row.metadata ?? {};
  const displayName =
    typeof metadata.display_name === 'string' && metadata.display_name.trim().length > 0
      ? metadata.display_name.trim()
      : typeof metadata.full_name === 'string' && metadata.full_name.trim().length > 0
        ? metadata.full_name.trim()
        : null;

  return {
    id: row.id,
    email: row.email,
    role: row.role,
    status: row.status,
    invited_by: row.invited_by,
    user_id: row.user_id,
    display_name: displayName,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function ownerFallbackMember(
  ownerEmail: string,
  tenantId: string | null,
  tenantName: string
): TeamMemberSummary {
  const now = new Date().toISOString();
  return {
    id: `owner-${tenantId ?? 'peskids'}`,
    email: ownerEmail,
    role: 'owner',
    status: 'active',
    invited_by: null,
    user_id: null,
    display_name: tenantName,
    created_at: now,
    updated_at: now,
  };
}

export async function loadPeskidsTeam(): Promise<TeamViewData> {
  const resolved = await resolveTenantRow();
  const tenantName = resolved.tenant?.name?.trim() || 'Peskids';
  const ownerEmail = resolved.tenant?.owner_email?.trim() || DEFAULT_OWNER_EMAIL;
  const members: TeamMemberSummary[] = [];
  const warnings = [...resolved.warnings];

  if (resolved.tenant) {
    try {
      const client = (await getPlatformClient()) as any;
      const platform = client.schema('platform') as any;
      const { data, error } = await platform
        .from('tenant_memberships')
        .select('id, email, role, status, invited_by, user_id, metadata, created_at, updated_at')
        .eq('tenant_id', resolved.tenant.id)
        .order('created_at', { ascending: false });

      if (error) {
        warnings.push(error.message || 'membership lookup failed');
      } else {
        for (const row of (data ?? []) as TenantMembershipRow[]) {
          members.push(membershipFromRow(row));
        }
      }
    } catch (err) {
      warnings.push(err instanceof Error ? err.message : 'membership lookup failed');
    }
  }

  if (
    !members.some(
      (member) => member.role === 'owner' && member.email.toLowerCase() === ownerEmail.toLowerCase()
    )
  ) {
    members.unshift(ownerFallbackMember(ownerEmail, resolved.tenant?.id ?? null, tenantName));
  }

  const deduped = new Map<string, TeamMemberSummary>();
  for (const member of members) {
    const key = `${member.email.toLowerCase()}::${member.role}`;
    if (!deduped.has(key)) {
      deduped.set(key, member);
    }
  }

  const hydratedMembers = await Promise.all(
    Array.from(deduped.values()).map(async (member) => {
      if (member.user_id) return member;
      const userId = await resolveAuthUserIdByEmail(member.email);
      if (!userId) return member;
      return { ...member, user_id: userId };
    })
  );

  return {
    tenant_slug: TENANT_SLUG,
    tenant_name: tenantName,
    owner_email: ownerEmail,
    members: hydratedMembers,
    warnings,
  };
}

function buildInviteHtml(params: {
  displayName: string;
  role: TeamRole;
  link: string;
  loginUrl: string;
  brandName: string;
  flow: TeamInviteFlow;
}): string {
  const logoUrl = escapeHtml(getLogoUrl());
  const safeLink = escapeHtml(params.link);
  const safeLoginUrl = escapeHtml(params.loginUrl);
  const safeBrandName = escapeHtml(params.brandName);
  const safeDisplayName = escapeHtml(params.displayName);
  const roleLabel =
    params.role === 'admin' ? 'Administrador' : params.role === 'support' ? 'Soporte' : 'Profesor';
  const flowLabel = params.flow === 'recovery' ? 'Definir contraseña' : 'Activar acceso';
  return `<!DOCTYPE html>
  <html lang="es"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>${safeBrandName}</title></head>
  <body style="margin:0;background:#eef7fb;color:#0f172a;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:linear-gradient(180deg,#e8f4fb 0%,#f7fbfd 100%);padding:40px 16px;">
      <tr><td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;background:#ffffff;border:1px solid #d7e7ef;border-radius:24px;overflow:hidden;box-shadow:0 18px 60px rgba(15,23,42,0.08);">
          <tr><td style="background:linear-gradient(135deg,#dff4f6 0%,#eef7fb 100%);padding:28px 32px 22px 32px;">
            <table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;"><tr>
              <td valign="middle" style="width:72px;">
                <img src="${logoUrl}" alt="${safeBrandName}" width="64" height="64" style="display:block;width:64px;height:64px;border-radius:20px;object-fit:cover;border:1px solid rgba(15,118,110,0.16);" />
              </td>
              <td valign="middle" style="padding-left:16px;">
                <div style="font-size:12px;letter-spacing:0.14em;text-transform:uppercase;color:#0f766e;font-weight:700;">${params.flow === 'recovery' ? 'Recuperación de acceso' : 'Invitación de equipo'}</div>
                <div style="font-size:28px;line-height:1.1;font-weight:800;color:#0f172a;margin-top:6px;">${safeBrandName}</div>
                <div style="font-size:14px;line-height:1.5;color:#334155;margin-top:6px;">${roleLabel} · ${params.flow === 'recovery' ? 'restablece tu contraseña' : 'activa tu acceso al panel'}</div>
              </td>
            </tr></table>
          </td></tr>
          <tr><td style="padding:34px 32px 24px 32px;">
            <div style="font-size:18px;line-height:1.6;color:#0f172a;font-weight:700;">Hola ${safeDisplayName},</div>
            <div style="height:12px;"></div>
            <div style="font-size:15px;line-height:1.75;color:#334155;">
              Tu acceso para <strong>${safeBrandName}</strong> está siendo configurado. Pulsa el botón para ${params.flow === 'recovery' ? 'definir una contraseña nueva' : 'activar tu cuenta'} y entrar al panel correcto.
            </div>
            <div style="height:26px;"></div>
            <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 auto;"><tr>
              <td align="center" bgcolor="#14b8a6" style="border-radius:999px;">
                <a href="${safeLink}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:999px;">${flowLabel}</a>
              </td>
            </tr></table>
            <div style="height:18px;"></div>
            <div style="font-size:13px;line-height:1.7;color:#475569;text-align:center;">Si el botón no abre, usa este enlace: <a href="${safeLink}" style="color:#0f766e;text-decoration:none;font-weight:700;">abrir acceso</a></div>
            <div style="height:22px;"></div>
            <div style="padding:18px 20px;border-radius:18px;background:#f8fcfd;border:1px solid #d6eef0;">
              <div style="font-size:13px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;color:#0f766e;">Para ti</div>
              <ol style="margin:12px 0 0 18px;padding:0;font-size:14px;line-height:1.8;color:#334155;">
                <li>Abre el botón y termina la activación o recuperación.</li>
                <li>Entra al panel en <a href="${safeLoginUrl}" style="color:#0f766e;text-decoration:none;font-weight:700;">${safeLoginUrl}</a>.</li>
                <li>Si no recibes el correo, revisa spam o pide reenvío desde el admin.</li>
              </ol>
            </div>
          </td></tr>
          <tr><td style="padding:0 32px 28px 32px;">
            <div style="border-top:1px solid #e2edf3;padding-top:18px;font-size:12px;line-height:1.6;color:#64748b;">Opsly · ${escapeHtml(TENANT_SLUG)} · ${escapeHtml(getPeskidsSiteUrl())}</div>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body></html>`;
}

async function createAuthLink(params: {
  email: string;
  name: string;
  role: TeamRole;
  flow: TeamInviteFlow;
}): Promise<{ link: string; token: string; actionLink: string }> {
  const admin = supabaseServer();
  const userData: Record<string, string> = {
    full_name: params.name,
    tenant_slug: TENANT_SLUG,
    role: params.role,
  };
  const recoveryNext =
    params.role === 'teacher'
      ? '/teacher/update-password'
      : params.role === 'support'
        ? '/support/update-password'
        : '/admin/update-password';
  const siteUrl = getPeskidsSiteUrl();
  const { data, error } = await (admin.auth.admin.generateLink as any)({
    type: params.flow,
    email: params.email,
    options: {
      data: userData,
      redirectTo:
        params.flow === 'recovery'
          ? `${siteUrl}/auth/callback?next=${encodeURIComponent(recoveryNext)}`
          : `${siteUrl}/invite`,
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  const actionLink = data.properties?.action_link;
  if (!actionLink) {
    throw new Error('generateLink did not return action_link');
  }

  const token = new URL(actionLink).searchParams.get('token');
  if (!token) {
    throw new Error('Could not parse invite token from action_link');
  }

  const hashedToken =
    typeof data.properties?.hashed_token === 'string' && data.properties.hashed_token.trim().length > 0
      ? data.properties.hashed_token.trim()
      : token;

  return {
    link:
      params.flow === 'recovery'
        ? `${siteUrl}/auth/callback?token_hash=${encodeURIComponent(hashedToken)}&type=recovery&next=${encodeURIComponent(recoveryNext)}`
        : `${siteUrl}/invite/${encodeURIComponent(token)}?email=${encodeURIComponent(params.email)}`,
    token,
    actionLink,
  };
}

export async function invitePeskidsTeamMember(params: {
  email: string;
  name: string;
  role: Exclude<TeamRole, 'owner'>;
}): Promise<TeamInviteResult> {
  const resolved = await resolveTenantRow();
  const tenantId = resolved.tenant?.id ?? null;
  const tenantName = resolved.tenant?.name?.trim() || 'Peskids';
  const ownerEmail = resolved.tenant?.owner_email?.trim() || DEFAULT_OWNER_EMAIL;

  const displayName = params.name.trim().length > 0 ? params.name.trim() : params.email.trim();
  const existingMember =
    tenantId !== null ? await findExistingMember(tenantId, params.email) : null;
  const flow: TeamInviteFlow =
    existingMember && existingMember.status === 'active' ? 'recovery' : 'invite';

  const authLink = await createAuthLink({
    email: params.email,
    name: displayName,
    role: params.role,
    flow,
  });

  const loginUrl = `${getPeskidsSiteUrl()}/admin/login`;
  const html = buildInviteHtml({
    displayName,
    role: params.role,
    link: authLink.link,
    loginUrl,
    brandName: tenantName,
    flow,
  });

  const sendResult = await sendTeamEmail({
    to: params.email,
    subject:
      flow === 'recovery' ? 'Tu acceso de Peskids está siendo activado' : `Invitación para ${tenantName}`,
    html,
  });

  const now = new Date().toISOString();
  const member: TeamMemberSummary = existingMember
    ? {
        ...existingMember,
        role: params.role,
        status: flow === 'recovery' ? 'active' : existingMember.status,
        display_name: displayName,
        updated_at: now,
      }
    : {
        id: `invite-${params.email.toLowerCase()}`,
        email: params.email,
        role: params.role,
        status: flow === 'recovery' ? 'active' : 'invited',
        invited_by: ownerEmail,
        user_id: null,
        display_name: displayName,
        created_at: now,
        updated_at: now,
      };

  if (tenantId) {
    try {
      await upsertMemberRow(tenantId, member, displayName, ownerEmail);
    } catch {
      // No bloqueamos el envío de correo si la sincronización de memberships falla.
    }
  }

  return {
    ok: true,
    flow,
    link: authLink.link,
    token: authLink.token,
    ...(sendResult.skipped
      ? {
          emailDeliverySkipped: true,
          emailDeliveryWarning: sendResult.warning,
        }
      : {}),
    ...(sendResult.warning ? { warning: sendResult.warning } : {}),
    member,
  };
}

export async function requestPeskidsStaffRecovery(email: string): Promise<TeamRecoveryRequestResult> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) {
    return { accepted: true, matched: false };
  }

  const team = await loadPeskidsTeam();
  const member = team.members.find(
    (item) =>
      item.email.toLowerCase() === normalizedEmail &&
      item.status !== 'disabled' &&
      ['owner', 'admin', 'support', 'teacher'].includes(item.role)
  );

  if (!member) {
    return { accepted: true, matched: false };
  }

  const displayName = member.display_name?.trim() || normalizedEmail.split('@')[0] || normalizedEmail;
  const authLink = await createAuthLink({
    email: member.email,
    name: displayName,
    role: member.role,
    flow: 'recovery',
  });

  const loginUrl =
    member.role === 'teacher'
      ? `${getPeskidsSiteUrl()}/teacher/login`
      : member.role === 'support'
        ? `${getPeskidsSiteUrl()}/support/login`
        : `${getPeskidsSiteUrl()}/admin/login`;

  const html = buildInviteHtml({
    displayName,
    role: member.role,
    link: authLink.link,
    loginUrl,
    brandName: team.tenant_name,
    flow: 'recovery',
  });

  const sendResult = await sendTeamEmail({
    to: member.email,
    subject: 'Tu acceso de Peskids está siendo activado',
    html,
  });

  return {
    accepted: true,
    matched: true,
    ...(sendResult.skipped
      ? {
          emailDeliverySkipped: true,
          emailDeliveryWarning: sendResult.warning,
        }
      : {}),
    ...(sendResult.warning ? { warning: sendResult.warning } : {}),
  };
}

async function findExistingMember(
  tenantId: string,
  email: string
): Promise<TeamMemberSummary | null> {
  try {
    const client = (await getPlatformClient()) as any;
    const platform = client.schema('platform') as any;
    const { data, error } = await platform
      .from('tenant_memberships')
      .select('id, email, role, status, invited_by, user_id, metadata, created_at, updated_at')
      .eq('tenant_id', tenantId)
      .ilike('email', email)
      .maybeSingle();

    if (error || !data) return null;
    return membershipFromRow(data as TenantMembershipRow);
  } catch {
    return null;
  }
}

async function upsertMemberRow(
  tenantId: string,
  member: TeamMemberSummary,
  displayName: string,
  invitedBy: string
): Promise<void> {
  const client = (await getPlatformClient()) as any;
  const platform = client.schema('platform') as any;
  const metadata = {
    display_name: displayName,
    invited_via: 'peskids-admin-panel',
    invited_by: invitedBy,
    tenant_slug: TENANT_SLUG,
  };

  const existing = await findExistingMember(tenantId, member.email);
  if (existing) {
    await platform
      .from('tenant_memberships')
      .update({
        role: member.role,
        status: member.status,
        invited_by: invitedBy,
        metadata,
        updated_at: new Date().toISOString(),
      })
      .eq('tenant_id', tenantId)
      .eq('email', member.email);
  } else {
    await platform.from('tenant_memberships').insert({
      tenant_id: tenantId,
      email: member.email,
      role: member.role,
      status: member.status,
      invited_by: invitedBy,
      metadata,
    });
  }
}
