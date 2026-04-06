import { escapeHtml, getInviteFromEmail, sendHtmlEmail } from "./email";
import { getServiceClient } from "./supabase";

export type PortalInviteParams = {
  email: string;
  name: string;
  slug: string;
};

const PORTAL_INVITE_HTML_TEMPLATE = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>Opsly</title></head>
<body style="margin:0;background:#0a0a0a;color:#fafafa;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0a0a0a;padding:32px 16px;"><tr><td align="center">
<table role="presentation" width="560" cellspacing="0" cellpadding="0" style="max-width:560px;background:#111111;border:1px solid #1e1e1e;border-radius:12px;padding:32px;">
<tr><td style="font-size:22px;font-weight:700;letter-spacing:-0.02em;color:#22c55e;">Opsly</td></tr>
<tr><td style="height:24px;"></td></tr>
<tr><td style="font-size:18px;line-height:1.5;">Hola {displayName},</td></tr>
<tr><td style="height:12px;"></td></tr>
<tr><td style="font-size:15px;line-height:1.6;color:#d4d4d4;">Tu plataforma de automatización está lista.</td></tr>
<tr><td style="height:28px;"></td></tr>
<tr><td align="center"><a href="{activateUrl}" style="display:inline-block;background:#22c55e;color:#0a0a0a;text-decoration:none;font-weight:600;font-size:15px;padding:14px 28px;border-radius:8px;">Activar mi cuenta</a></td></tr>
<tr><td style="height:32px;"></td></tr>
<tr><td style="font-size:13px;font-weight:600;color:#a3a3a3;text-transform:uppercase;letter-spacing:0.06em;">Lo que tienes disponible</td></tr>
<tr><td style="height:12px;"></td></tr>
<tr><td style="font-size:14px;line-height:1.8;color:#e5e5e5;"><div>✅ Motor de automatización</div><div>✅ Monitor 24/7</div><div>✅ Dominio propio</div></td></tr>
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

export function getPortalSiteUrl(): string {
  const explicit = process.env.PORTAL_SITE_URL?.trim();
  if (explicit && explicit.length > 0) {
    return explicit.replace(/\/$/, "");
  }
  const domain =
    process.env.PLATFORM_DOMAIN?.trim() ??
    process.env.PLATFORM_BASE_DOMAIN?.trim();
  if (domain && domain.length > 0) {
    return `https://portal.${domain}`;
  }
  throw new Error(
    "PORTAL_SITE_URL or PLATFORM_DOMAIN is required for portal invites",
  );
}

function parseInviteTokenFromActionLink(actionLink: string): string | null {
  try {
    const u = new URL(actionLink);
    return u.searchParams.get("token");
  } catch {
    return null;
  }
}

function footerLineFromEnv(): string {
  const domain =
    process.env.PLATFORM_DOMAIN?.trim() ??
    process.env.PLATFORM_BASE_DOMAIN?.trim();
  if (domain && domain.length > 0) {
    return `Opsly · ${domain}`;
  }
  return "Opsly";
}

function buildPortalInviteHtml(
  displayName: string,
  activateUrl: string,
): string {
  const safeName = escapeHtml(displayName);
  const safeUrl = escapeHtml(activateUrl);
  const safeFooter = escapeHtml(footerLineFromEnv());
  return PORTAL_INVITE_HTML_TEMPLATE.replace("{displayName}", safeName)
    .replace("{activateUrl}", safeUrl)
    .replace("{footerLine}", safeFooter);
}

async function generateInviteLink(
  email: string,
  name: string,
  slug: string,
): Promise<string> {
  const admin = getServiceClient();
  const portalBase = getPortalSiteUrl();

  const { data, error } = await admin.auth.admin.generateLink({
    type: "invite",
    email,
    options: {
      data: {
        full_name: name,
        tenant_slug: slug,
      },
      redirectTo: `${portalBase}/invite`,
    },
  });

  if (error) {
    throw new Error(error.message);
  }
  const actionLink = data.properties?.action_link;
  if (!actionLink || actionLink.length === 0) {
    throw new Error("generateLink did not return action_link");
  }

  const token = parseInviteTokenFromActionLink(actionLink);
  if (!token || token.length === 0) {
    throw new Error("Could not parse invite token from action_link");
  }

  return `${portalBase}/invite/${encodeURIComponent(token)}?email=${encodeURIComponent(email)}`;
}

export async function sendPortalInvitationForTenant(
  params: PortalInviteParams,
): Promise<void> {
  requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  requireEnv("SUPABASE_SERVICE_ROLE_KEY");

  const activateUrl = await generateInviteLink(
    params.email,
    params.name,
    params.slug,
  );

  const html = buildPortalInviteHtml(params.name, activateUrl);

  await sendHtmlEmail({
    to: params.email,
    subject: "Tu espacio en Opsly está listo 🚀",
    html,
    from: getInviteFromEmail(),
  });
}
