type AppUrlConfig = {
  envName: string;
  localPort: number;
  prodSubdomain: string;
  prodFallback: string;
};

function normalizeUrl(value: string): string {
  return value.replace(/\/$/, '');
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

function isProductionRuntime(): boolean {
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

export function resolveAppOrigin(config: AppUrlConfig): string {
  const fallbackEnvName = config.envName.startsWith('NEXT_PUBLIC_')
    ? config.envName.replace(/^NEXT_PUBLIC_/, '')
    : `NEXT_PUBLIC_${config.envName}`;
  const explicit = process.env[config.envName]?.trim() ?? process.env[fallbackEnvName]?.trim();
  if (explicit && explicit.length > 0) {
    return normalizeLocalDevOrigin(explicit);
  }

  if (!isProductionRuntime()) {
    return `http://localhost:${config.localPort}`;
  }

  const domain = process.env.PLATFORM_DOMAIN?.trim() ?? process.env.PLATFORM_BASE_DOMAIN?.trim();
  if (domain && domain.length > 0) {
    return `https://${config.prodSubdomain}.${domain}`;
  }

  return config.prodFallback;
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
