import { slugToEnvPrefix } from './env-slug.js';
import type { PortalInviteBranding, TenantProfile } from './types.js';

function isIncubatedApp(profile: TenantProfile): boolean {
  return profile.stack_type === 'incubator-app' || Boolean(profile.public_url);
}

/** Portal invitation branding from tenant profile + env overrides. */
export function getPortalInviteBranding(
  profile: TenantProfile,
  siteUrl: string
): PortalInviteBranding {
  const brandName = profile.tenant_name;
  const prefix = slugToEnvPrefix(profile.tenant_slug);

  const logoPathFromEnv = process.env[`TENANT_${prefix}_BRAND_LOGO_PATH`]?.trim();
  const logoPath =
    logoPathFromEnv ??
    profile.brand_logo_path ??
    (isIncubatedApp(profile) ? '/brand/logo-reference.png' : null);

  const logoUrl = logoPath
    ? `${siteUrl.replace(/\/$/, '')}${logoPath.startsWith('/') ? logoPath : `/${logoPath}`}`
    : null;

  const subjectFromEnv = process.env[`TENANT_${prefix}_INVITE_SUBJECT`]?.trim();
  const emailSubject =
    subjectFromEnv ??
    profile.invite_email_subject ??
    (isIncubatedApp(profile)
      ? `Tu acceso al panel de ${brandName} está listo`
      : `Tu plataforma ${brandName} está lista 🚀`);

  return { brandName, logoUrl, emailSubject };
}
