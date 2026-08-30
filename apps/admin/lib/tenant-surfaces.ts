import type { Json } from './types';
import { parseServiceUrls } from './service-urls';
import { resolveTenantSiteTarget } from '../../../lib/runtime/src/tenant-site-routing'

/** Cómo opera el tenant respecto al control plane Opsly. */
export type TenantDeploymentMode = 'incubated' | 'dedicated';

export type TenantSurfaceLink = {
  id: string;
  label: string;
  href: string;
  description: string;
};

export type TenantSurfaces = {
  slug: string;
  deploymentMode: TenantDeploymentMode;
  links: TenantSurfaceLink[];
};

function metadataRecord(meta: Json): Record<string, unknown> {
  if (meta === null || typeof meta !== 'object' || Array.isArray(meta)) {
    return {};
  }
  return meta as Record<string, unknown>;
}

function readString(meta: Record<string, unknown>, key: string): string | null {
  const value = meta[key];
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeOrigin(url: string): string {
  return url.replace(/\/$/, '');
}

function platformDomain(): string {
  return (
    process.env.NEXT_PUBLIC_PLATFORM_DOMAIN?.trim() ||
    process.env.PLATFORM_DOMAIN?.trim() ||
    'op-sly.com'
  );
}

function resolveIncubatedStaffOrigin(slug: string): string | null {
  const target = resolveTenantSiteTarget(slug, {
    portal: {
      siteUrl: `https://portal.${platformDomain()}`,
      loginPath: '/login',
    },
    tenantRules: [
      {
        tenantSlug: 'peskids',
        siteUrl:
          process.env.NEXT_PUBLIC_PESKIDS_SITE_URL?.trim() ||
          process.env.PESKIDS_SITE_URL?.trim() ||
          'https://peskids.op-sly.com',
        loginPath: '/login',
        staffLoginPath: '/admin/login',
      },
    ],
  });

  return target.siteUrl;
}

function resolveDeploymentMode(meta: Record<string, unknown>): TenantDeploymentMode {
  const raw = readString(meta, 'deployment_mode');
  if (raw === 'dedicated' || raw === 'extracted') {
    return 'dedicated';
  }
  if (raw === 'incubated') {
    return 'incubated';
  }
  if (readString(meta, 'client_base_url')) {
    return 'dedicated';
  }
  return 'incubated';
}

/**
 * URLs de revisión para operadores Opsly.
 * Prioriza el dominio del cliente (VPS propio); el portal central solo en incubación.
 */
export function resolveTenantSurfaces(
  slug: string,
  services: Json,
  metadata: Json
): TenantSurfaces {
  const meta = metadataRecord(metadata);
  const deploymentMode = resolveDeploymentMode(meta);
  const domain = platformDomain();
  const stack = parseServiceUrls(services);

  const clientBase = readString(meta, 'client_base_url');
  const staffApp = readString(meta, 'staff_app_url');
  const portalApp = readString(meta, 'portal_app_url');
  const incubatedStaff =
    staffApp ?? resolveIncubatedStaffOrigin(slug) ?? (clientBase ? `${normalizeOrigin(clientBase)}/admin` : null);

  const links: TenantSurfaceLink[] = [];

  if (deploymentMode === 'dedicated') {
    if (clientBase) {
      links.push({
        id: 'client-site',
        label: 'Sitio cliente',
        href: normalizeOrigin(clientBase),
        description: 'Producto en VPS/dominio del cliente (desacoplado de Opsly).',
      });
    }
    if (staffApp) {
      links.push({
        id: 'staff-app',
        label: 'Panel operativo',
        href: normalizeOrigin(staffApp),
        description: 'Admin/staff del tenant en infraestructura del cliente.',
      });
    } else if (incubatedStaff) {
      links.push({
        id: 'staff-app',
        label: 'Panel operativo',
        href: incubatedStaff.includes('/admin') ? incubatedStaff : `${incubatedStaff}/admin`,
        description: 'Ruta staff conocida (revisar metadata tras migración).',
      });
    }
    if (portalApp) {
      links.push({
        id: 'client-portal',
        label: 'Portal cliente',
        href: normalizeOrigin(portalApp),
        description: 'Portal en dominio del cliente (no portal.op-sly.com).',
      });
    }
  } else {
    if (incubatedStaff) {
      const staffUrl = incubatedStaff.includes('/admin')
        ? incubatedStaff
        : `${normalizeOrigin(incubatedStaff)}/admin`;
      links.push({
        id: 'staff-app',
        label: 'App / panel tenant',
        href: staffUrl,
        description: 'Producto incubado (ej. Peskids) en dominio propio del piloto.',
      });
      links.push({
        id: 'client-landing',
        label: 'Landing pública',
        href: normalizeOrigin(incubatedStaff),
        description: 'Vista pública del tenant.',
      });
    }
    links.push({
      id: 'opsly-portal',
      label: 'Portal Opsly (incubación)',
      href: `https://portal.${domain}/dashboard/${encodeURIComponent(slug)}/workflows`,
      description:
        'Vista multi-tenant del control plane; requiere sesión invitada al tenant (no super-admin).',
    });
  }

  if (stack.n8n) {
    links.push({
      id: 'n8n',
      label: 'n8n',
      href: stack.n8n,
      description: 'Automatización del stack del tenant (URL en services).',
    });
  }
  if (stack.uptime) {
    links.push({
      id: 'uptime',
      label: 'Uptime Kuma',
      href: stack.uptime,
      description: 'Monitoreo del stack del tenant.',
    });
  }

  links.push({
    id: 'opsly-admin-tenant',
    label: 'Ficha en Opsly Admin',
    href: `/tenants/${encodeURIComponent(slug)}`,
    description: 'Detalle operativo en este dashboard (ruta relativa).',
  });

  return { slug, deploymentMode, links };
}
