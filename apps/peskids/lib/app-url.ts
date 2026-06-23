type AppUrlConfig = {
  envName: string;
  localPort: number;
  prodSubdomain: string;
  prodFallback: string;
};

const PESKIDS_PRODUCTION_FALLBACK = 'https://peskids.op-sly.com';

function normalizeUrl(value: string): string {
  return value.replace(/\/$/, '');
}

function hostnameFromUrl(value: string): string | null {
  try {
    return new URL(value).hostname;
  } catch {
    return null;
  }
}

/** True when origin must not be used for public auth redirects in production. */
export function isLocalhostLikeOrigin(value: string): boolean {
  const hostname = hostnameFromUrl(value);
  if (!hostname) {
    return false;
  }
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0';
}

/** Dev servers bound to 0.0.0.0 must use localhost in auth redirect URLs. */
export function normalizeLocalDevOrigin(value: string): string {
  try {
    const parsed = new URL(value);
    if (parsed.hostname === '0.0.0.0') {
      parsed.hostname = 'localhost';
      return normalizeUrl(parsed.toString());
    }
  } catch {
    return normalizeUrl(value);
  }
  return normalizeUrl(value);
}

export function isProductionRuntime(): boolean {
  const nodeEnv = process.env.NODE_ENV?.trim().toLowerCase();
  if (nodeEnv === 'production' || nodeEnv === 'test') {
    return true;
  }

  const dopplerConfig = process.env.DOPPLER_CONFIG?.trim().toLowerCase();
  if (dopplerConfig === 'prd' || dopplerConfig === 'prod' || dopplerConfig === 'production') {
    return true;
  }

  return false;
}

function resolveProductionFallback(config: AppUrlConfig): string {
  const domain = process.env.PLATFORM_DOMAIN?.trim() ?? process.env.PLATFORM_BASE_DOMAIN?.trim();
  if (domain && domain.length > 0) {
    return normalizeUrl(`https://${config.prodSubdomain}.${domain}`);
  }
  return normalizeUrl(config.prodFallback);
}

function readExplicitOrigin(envNames: string[]): string | null {
  for (const envName of envNames) {
    const value = process.env[envName]?.trim();
    if (!value) {
      continue;
    }
    const normalized = normalizeLocalDevOrigin(value);
    if (isProductionRuntime() && isLocalhostLikeOrigin(normalized)) {
      continue;
    }
    return normalized;
  }
  return null;
}

/**
 * Public base URL for Peskids auth emails and server-side redirects.
 * Never returns localhost in production (Doppler/VPS misconfig safe).
 */
export function getPeskidsPublicBaseUrl(): string {
  const explicit = readExplicitOrigin([
    'PESKIDS_PUBLIC_URL',
    'NEXT_PUBLIC_PESKIDS_SITE_URL',
    'NEXT_PUBLIC_SITE_URL',
    'NEXT_PUBLIC_APP_URL',
    'PESKIDS_SITE_URL',
    'SITE_URL',
  ]);

  if (explicit) {
    return explicit;
  }

  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl) {
    const vercelOrigin = normalizeUrl(
      vercelUrl.startsWith('http') ? vercelUrl : `https://${vercelUrl}`
    );
    if (!isProductionRuntime() || !isLocalhostLikeOrigin(vercelOrigin)) {
      return vercelOrigin;
    }
  }

  if (isProductionRuntime()) {
    return normalizeUrl(PESKIDS_PRODUCTION_FALLBACK);
  }

  return `http://localhost:3004`;
}

export function resolveAppOrigin(config: AppUrlConfig): string {
  if (config.prodSubdomain === 'peskids') {
    return getPeskidsPublicBaseUrl();
  }

  const fallbackEnvName = config.envName.startsWith('NEXT_PUBLIC_')
    ? config.envName.replace(/^NEXT_PUBLIC_/, '')
    : `NEXT_PUBLIC_${config.envName}`;
  const explicit = readExplicitOrigin([config.envName, fallbackEnvName]);
  if (explicit) {
    return explicit;
  }

  if (!isProductionRuntime()) {
    return `http://localhost:${config.localPort}`;
  }

  return resolveProductionFallback(config);
}

export const PESKIDS_APP_ORIGIN = resolveAppOrigin({
  envName: 'NEXT_PUBLIC_PESKIDS_SITE_URL',
  localPort: 3004,
  prodSubdomain: 'peskids',
  prodFallback: 'https://peskids.op-sly.com',
});

export const PORTAL_APP_ORIGIN = resolveAppOrigin({
  envName: 'NEXT_PUBLIC_PORTAL_URL',
  localPort: 3002,
  prodSubdomain: 'portal',
  prodFallback: 'https://portal.op-sly.com',
});

export const ADMIN_APP_ORIGIN = resolveAppOrigin({
  envName: 'NEXT_PUBLIC_ADMIN_URL',
  localPort: 3001,
  prodSubdomain: 'admin',
  prodFallback: 'https://admin.op-sly.com',
});
