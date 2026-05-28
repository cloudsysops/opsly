import { escapeHtml, getInviteFromEmail, sendHtmlEmail } from './email';
import { isEmailDeliverySkipped, isNonFatalEmailDeliveryError } from './email/delivery-mode';
import { getServiceClient } from './supabase';

export type PortalInviteParams = {
  email: string;
  name: string;
  slug: string;
};

const PESKIDS_TENANT_SLUG = 'peskids';

function isProductionRuntime(): boolean {
  const nodeEnv = process.env.NODE_ENV?.trim().toLowerCase();
  if (nodeEnv === 'production') {
    return true;
  }

  const dopplerConfig = process.env.DOPPLER_CONFIG?.trim().toLowerCase();
  return dopplerConfig === 'prd' || dopplerConfig === 'prod' || dopplerConfig === 'production';
}

const PORTAL_INVITE_HTML_TEMPLATE = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>{brandName}</title></head>
<body style="margin:0;background:#09090b;color:#fafafa;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#09090b;padding:32px 16px;"><tr><td align="center">
<table role="presentation" width="560" cellspacing="0" cellpadding="0" style="max-width:560px;background:#111111;border:1px solid #1e1e1e;border-radius:12px;padding:32px;">
<tr><td style="font-size:22px;font-weight:700;letter-spacing:-0.02em;color:#22c55e;">{brandName}</td></tr>
<tr><td style="height:24px;"></td></tr>
<tr><td style="font-size:18px;line-height:1.5;">Hola {displayName},</td></tr>
<tr><td style="height:12px;"></td></tr>
<tr><td style="font-size:15px;line-height:1.6;color:#d4d4d4;">Tu espacio <strong>{companyName}</strong> está listo: activa tu acceso y entra al panel correspondiente.</td></tr>
<tr><td style="height:28px;"></td></tr>
<tr><td align="center"><a href="{activateUrl}" style="display:inline-block;background:#22c55e;color:#09090b;text-decoration:none;font-weight:600;font-size:15px;padding:14px 28px;border-radius:8px;">Activar mi cuenta</a></td></tr>
<tr><td style="height:28px;"></td></tr>
<tr><td style="font-size:14px;line-height:1.6;color:#d4d4d4;"><strong style="color:#fafafa;">Primeros pasos</strong>
<ol style="margin:12px 0 0 18px;padding:0;line-height:1.7;">
<li>Pulsa <strong>Activar mi cuenta</strong> y define una contraseña segura.</li>
<li>Accede al <a href="{portalHomeUrl}" style="color:#22c55e;text-decoration:none;">panel</a> y revisa tu dashboard.</li>
<li>En modo desarrollador encontrarás las URLs y credenciales cuando apliquen.</li>
</ol></td></tr>
<tr><td style="height:20px;"></td></tr>
<tr><td style="font-size:14px;line-height:1.6;color:#d4d4d4;"><strong style="color:#fafafa;">Feedback</strong><br />
En el panel hay un chat de feedback: úsalo para reportar incidencias o sugerencias; el equipo lo revisa.</td></tr>
<tr><td style="height:28px;"></td></tr>
<tr><td style="font-size:13px;font-weight:600;color:#a3a3a3;text-transform:uppercase;letter-spacing:0.06em;">Incluido en tu plan</td></tr>
<tr><td style="height:12px;"></td></tr>
<tr><td style="font-size:14px;line-height:1.8;color:#e5e5e5;"><div>✅ Motor de automatización (n8n)</div><div>✅ Monitor de disponibilidad 24/7</div><div>✅ Enlaces dedicados para tu organización</div></td></tr>
<tr><td style="height:28px;"></td></tr>
<tr><td style="font-size:12px;color:#737373;border-top:1px solid #1e1e1e;padding-top:20px;">{footerLine}</td></tr>
</table></td></tr></table></body></html>`;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function getSiteUrlFromEnv(options: {
  envName: string;
  localPort: number;
  prodSubdomain: string;
  prodFallback: string;
}): string {
  const explicit = process.env[options.envName]?.trim();
  if (explicit && explicit.length > 0) {
    return explicit.replace(/\/$/, '');
  }
  if (!isProductionRuntime()) {
    return `http://localhost:${options.localPort}`;
  }
  const domain = process.env.PLATFORM_DOMAIN?.trim() ?? process.env.PLATFORM_BASE_DOMAIN?.trim();
  if (domain && domain.length > 0) {
    return `https://${options.prodSubdomain}.${domain}`;
  }
  return options.prodFallback;
}

export function getPortalSiteUrl(): string {
  const explicit =
    process.env.PORTAL_SITE_URL?.trim() ?? process.env.NEXT_PUBLIC_PORTAL_URL?.trim();
  if (explicit && explicit.length > 0) {
    return explicit.replace(/\/$/, '');
  }
  return getSiteUrlFromEnv({
    envName: 'PORTAL_SITE_URL',
    localPort: 3002,
    prodSubdomain: 'portal',
    prodFallback: 'https://portal.op-sly.com',
  });
}

function getTenantSiteUrl(slug: string): string {
  if (slug === PESKIDS_TENANT_SLUG) {
    const explicit =
      process.env.NEXT_PUBLIC_PESKIDS_SITE_URL?.trim() ?? process.env.PESKIDS_SITE_URL?.trim();
    if (explicit && explicit.length > 0) {
      return explicit.replace(/\/$/, '');
    }
    return getSiteUrlFromEnv({
      envName: 'NEXT_PUBLIC_PESKIDS_SITE_URL',
      localPort: 3004,
      prodSubdomain: 'peskids',
      prodFallback: 'https://peskids.op-sly.com',
    });
  }

  return getPortalSiteUrl();
}

function parseInviteTokenFromActionLink(actionLink: string): string | null {
  try {
    const u = new URL(actionLink);
    return u.searchParams.get('token');
  } catch {
    return null;
  }
}

function footerLineFromEnv(): string {
  const domain = process.env.PLATFORM_DOMAIN?.trim() ?? process.env.PLATFORM_BASE_DOMAIN?.trim();
  if (domain && domain.length > 0) {
    return `Opsly · ${domain}`;
  }
  return 'Opsly';
}

function buildPortalInviteHtml(
  displayName: string,
  companyName: string,
  activateUrl: string,
  homeUrl: string,
  brandName: string
): string {
  const safeName = escapeHtml(displayName);
  const safeCompany = escapeHtml(companyName);
  const safeUrl = escapeHtml(activateUrl);
  const safeHome = escapeHtml(homeUrl);
  const safeBrand = escapeHtml(brandName);
  const safeFooter = escapeHtml(footerLineFromEnv());
  return PORTAL_INVITE_HTML_TEMPLATE.replace('{displayName}', safeName)
    .replace('{brandName}', safeBrand)
    .replace('{companyName}', safeCompany)
    .replace('{activateUrl}', safeUrl)
    .replace('{portalHomeUrl}', safeHome)
    .replace('{footerLine}', safeFooter);
}

export type PortalInviteLinkResult = {
  link: string;
  token: string;
  emailDeliverySkipped?: boolean;
  emailDeliveryWarning?: string;
};

async function generateInviteLink(
  email: string,
  name: string,
  slug: string,
  mode?: 'developer' | 'managed'
): Promise<PortalInviteLinkResult> {
  const admin = getServiceClient();
  const tenantBase = getTenantSiteUrl(slug);

  const userData: Record<string, string> = {
    full_name: name,
    tenant_slug: slug,
  };
  if (mode) {
    userData.mode = mode;
  }

  const { data, error } = await admin.auth.admin.generateLink({
    type: 'invite',
    email,
    options: {
      data: userData,
      redirectTo: `${tenantBase}/invite`,
    },
  });

  if (error) {
    throw new Error(error.message);
  }
  const actionLink = data.properties?.action_link;
  if (!actionLink || actionLink.length === 0) {
    throw new Error('generateLink did not return action_link');
  }

  const token = parseInviteTokenFromActionLink(actionLink);
  if (!token || token.length === 0) {
    throw new Error('Could not parse invite token from action_link');
  }

  const link = `${tenantBase}/invite/${encodeURIComponent(token)}?email=${encodeURIComponent(email)}`;
  return { link, token };
}

export async function sendPortalInvitationForTenant(
  params: PortalInviteParams & { mode?: 'developer' | 'managed' }
): Promise<PortalInviteLinkResult> {
  requireEnv('NEXT_PUBLIC_SUPABASE_URL');
  requireEnv('SUPABASE_SERVICE_ROLE_KEY');

  const { link: activateUrl, token } = await generateInviteLink(
    params.email,
    params.name,
    params.slug,
    params.mode
  );

  const homeUrl =
    params.slug === PESKIDS_TENANT_SLUG
      ? `${getTenantSiteUrl(params.slug)}/admin/login`
      : `${getTenantSiteUrl(params.slug)}/login`;
  const brandName = params.slug === PESKIDS_TENANT_SLUG ? 'Peskids' : 'Opsly';
  const html = buildPortalInviteHtml(params.name, params.name, activateUrl, homeUrl, brandName);

  let emailDeliverySkipped = isEmailDeliverySkipped();
  let emailDeliveryWarning: string | undefined = emailDeliverySkipped
    ? 'EMAIL_DELIVERY_MODE=test (no Resend send)'
    : undefined;
  if (!emailDeliverySkipped) {
    try {
      await sendHtmlEmail({
        to: params.email,
        subject: `Tu plataforma ${params.name} está lista 🚀`,
        html,
        from: getInviteFromEmail(),
      });
    } catch (err) {
      if (!isNonFatalEmailDeliveryError(err)) {
        throw err;
      }
      emailDeliverySkipped = true;
      emailDeliveryWarning =
        err instanceof Error
          ? err.message
          : 'Email delivery skipped (test mode or provider restriction)';
    }
  }

  return {
    link: activateUrl,
    token,
    ...(emailDeliverySkipped ? { emailDeliverySkipped: true, emailDeliveryWarning } : {}),
  };
}
