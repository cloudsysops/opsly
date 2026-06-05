import { escapeHtml, getInviteFromEmail, sendHtmlEmail } from './email';
import { isEmailDeliverySkipped, isNonFatalEmailDeliveryError } from './email/delivery-mode';
import { getServiceClient } from './supabase';
import {
  buildTenantSiteRoutingConfig,
  getPortalInviteBranding,
  loadTenantProfile,
  resolveIncubatedTenantSiteUrl,
} from '@intcloudsysops/tenant-profile';
import { resolveTenantSiteTarget } from '../../../lib/runtime/src/tenant-site-routing';

export type PortalInviteParams = {
  email: string;
  name: string;
  slug: string;
};

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
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>{brandName}</title>
</head>
<body style="margin:0;background:#eef7fb;color:#0f172a;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:linear-gradient(180deg,#e8f4fb 0%,#f7fbfd 100%);padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;background:#ffffff;border:1px solid #d7e7ef;border-radius:24px;overflow:hidden;box-shadow:0 18px 60px rgba(15,23,42,0.08);">
          <tr>
            <td style="background:linear-gradient(135deg,#dff4f6 0%,#eef7fb 100%);padding:28px 32px 22px 32px;">
              <table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;">
                <tr>
                  <td valign="middle" style="width:72px;">
                    {logoBlock}
                  </td>
                  <td valign="middle" style="padding-left:16px;">
                    <div style="font-size:12px;letter-spacing:0.14em;text-transform:uppercase;color:#0f766e;font-weight:700;">Acceso al panel</div>
                    <div style="font-size:28px;line-height:1.1;font-weight:800;color:#0f172a;margin-top:6px;">{brandName}</div>
                    <div style="font-size:14px;line-height:1.5;color:#334155;margin-top:6px;">Tu espacio está listo para activar acceso y continuar en el panel correcto.</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:34px 32px 24px 32px;">
              <div style="font-size:18px;line-height:1.6;color:#0f172a;font-weight:700;">Hola {displayName},</div>
              <div style="height:12px;"></div>
              <div style="font-size:15px;line-height:1.75;color:#334155;">
                Tu acceso para <strong>{companyName}</strong> ya está preparado.
                Solo falta activar la contraseña y entrar al panel.
              </div>
              <div style="height:26px;"></div>
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 auto;">
                <tr>
                  <td align="center" bgcolor="#14b8a6" style="border-radius:999px;">
                    <a href="{activateUrl}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:999px;">Activar mi cuenta</a>
                  </td>
                </tr>
              </table>
              <div style="height:24px;"></div>
              <div style="padding:18px 20px;border-radius:18px;background:#f8fcfd;border:1px solid #d6eef0;">
                <div style="font-size:13px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;color:#0f766e;">Siguientes pasos</div>
                <ol style="margin:12px 0 0 18px;padding:0;font-size:14px;line-height:1.8;color:#334155;">
                  <li>Abre <strong>Activar mi cuenta</strong> y define una contraseña segura.</li>
                  <li>Entra al <a href="{portalHomeUrl}" style="color:#0f766e;text-decoration:none;font-weight:700;">panel</a> y revisa tu dashboard.</li>
                  <li>Si el correo no llega, usa el enlace manual de respaldo o revisa el spam.</li>
                </ol>
              </div>
              <div style="height:22px;"></div>
              <div style="font-size:14px;line-height:1.7;color:#475569;">
                En el panel también verás feedback, seguimiento y accesos dedicados para tu organización.
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 28px 32px;">
              <div style="border-top:1px solid #e2edf3;padding-top:18px;font-size:12px;line-height:1.6;color:#64748b;">
                {footerLine}
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

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

async function getTenantSiteUrl(slug: string): Promise<string> {
  const profile = await loadTenantProfile(slug);
  if (profile) {
    return resolveIncubatedTenantSiteUrl(profile);
  }
  const routing = await buildTenantSiteRoutingConfig(getPortalSiteUrl());
  return resolveTenantSiteTarget(slug, routing).siteUrl;
}

async function getTenantSiteRouting() {
  return buildTenantSiteRoutingConfig(getPortalSiteUrl());
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

function buildLogoBlock(logoUrl: string | null, brandName: string): string {
  if (!logoUrl) {
    return `<div style="width:64px;height:64px;border-radius:20px;background:#14b8a6;color:#ffffff;font-weight:800;display:flex;align-items:center;justify-content:center;font-size:16px;line-height:1.1;text-align:center;">${escapeHtml(
      brandName
    )}</div>`;
  }

  return `<img src="${escapeHtml(logoUrl)}" alt="${escapeHtml(
    brandName
  )}" width="64" height="64" style="display:block;width:64px;height:64px;border-radius:20px;object-fit:cover;border:1px solid rgba(15,118,110,0.16);" />`;
}

function buildPortalInviteHtml(
  displayName: string,
  companyName: string,
  activateUrl: string,
  homeUrl: string,
  brandName: string,
  logoUrl: string | null
): string {
  const safeName = escapeHtml(displayName);
  const safeCompany = escapeHtml(companyName);
  const safeUrl = escapeHtml(activateUrl);
  const safeHome = escapeHtml(homeUrl);
  const safeBrand = escapeHtml(brandName);
  const safeFooter = escapeHtml(footerLineFromEnv());
  const safeLogoBlock = buildLogoBlock(logoUrl, brandName);
  return PORTAL_INVITE_HTML_TEMPLATE.replace('{displayName}', safeName)
    .replace('{brandName}', safeBrand)
    .replace('{companyName}', safeCompany)
    .replace('{activateUrl}', safeUrl)
    .replace('{portalHomeUrl}', safeHome)
    .replace('{logoBlock}', safeLogoBlock)
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
  const tenantBase = await getTenantSiteUrl(slug);

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

  const siteUrl = await getTenantSiteUrl(params.slug);
  const profile = await loadTenantProfile(params.slug);
  const routing = await getTenantSiteRouting();
  const homeUrl = resolveTenantSiteTarget(params.slug, routing).loginUrl;
  const branding = profile
    ? getPortalInviteBranding(profile, siteUrl)
    : {
        brandName: params.name,
        logoUrl: null as string | null,
        emailSubject: `Tu plataforma ${params.name} está lista 🚀`,
      };
  const html = buildPortalInviteHtml(
    params.name,
    params.name,
    activateUrl,
    homeUrl,
    branding.brandName,
    branding.logoUrl
  );

  let emailDeliverySkipped = isEmailDeliverySkipped();
  let emailDeliveryWarning: string | undefined = emailDeliverySkipped
    ? 'EMAIL_DELIVERY_MODE=test (no Resend send)'
    : undefined;
  if (!emailDeliverySkipped) {
    try {
      await sendHtmlEmail({
        to: params.email,
        subject: branding.emailSubject,
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
