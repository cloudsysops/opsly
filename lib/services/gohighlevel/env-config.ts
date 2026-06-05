export const GOHIGHLEVEL_DEFAULT_API_URL = 'https://services.leadconnectorhq.com';
export const GOHIGHLEVEL_DEFAULT_API_VERSION = '2021-07-28';
/** Calendars API subset (create calendar + schedule). */
export const GOHIGHLEVEL_CALENDAR_API_VERSION = '2021-04-15';
export const GOHIGHLEVEL_LEGACY_API_URL = 'https://api.gohighlevel.com';

export interface GoHighLevelEnvConfig {
  apiKey: string;
  baseUrl: string;
  apiVersion: string;
  locationId: string;
  privateIntegrationId: string;
  usesLeadConnector: boolean;
}

export function resolveGoHighLevelEnv(
  env: Record<string, string | undefined> = process.env as Record<string, string | undefined>
): GoHighLevelEnvConfig {
  const baseUrl = (env.GOHIGHLEVEL_API_URL?.trim() || GOHIGHLEVEL_DEFAULT_API_URL).replace(
    /\/$/,
    ''
  );
  const apiVersion = env.GOHIGHLEVEL_API_VERSION?.trim() || GOHIGHLEVEL_DEFAULT_API_VERSION;

  return {
    apiKey: env.GOHIGHLEVEL_API_KEY?.trim() || '',
    baseUrl,
    apiVersion,
    locationId: env.GOHIGHLEVEL_LOCATION_ID?.trim() || '',
    privateIntegrationId: env.GOHIGHLEVEL_PRIVATE_INTEGRATION_ID?.trim() || '',
    usesLeadConnector: baseUrl.includes('leadconnectorhq.com'),
  };
}

export function isGoHighLevelConfigured(
  env: Record<string, string | undefined> = process.env as Record<string, string | undefined>
): boolean {
  return resolveGoHighLevelEnv(env).apiKey.length > 0;
}

/** Peskids subaccount — does not replace agency `GOHIGHLEVEL_*` (Intcloudsysops LLC). */
export function resolveGoHighLevelPeskidsEnv(
  env: Record<string, string | undefined> = process.env as Record<string, string | undefined>
): GoHighLevelEnvConfig {
  const baseUrl = (
    env.GOHIGHLEVEL_PESKIDS_API_URL?.trim() ||
    env.GOHIGHLEVEL_API_URL?.trim() ||
    GOHIGHLEVEL_DEFAULT_API_URL
  ).replace(/\/$/, '');
  const apiVersion =
    env.GOHIGHLEVEL_PESKIDS_API_VERSION?.trim() ||
    env.GOHIGHLEVEL_API_VERSION?.trim() ||
    GOHIGHLEVEL_DEFAULT_API_VERSION;

  return {
    apiKey: env.GOHIGHLEVEL_PESKIDS_API_KEY?.trim() || '',
    baseUrl,
    apiVersion,
    locationId: env.GOHIGHLEVEL_PESKIDS_LOCATION_ID?.trim() || '',
    privateIntegrationId: env.GOHIGHLEVEL_PESKIDS_PRIVATE_INTEGRATION_ID?.trim() || '',
    usesLeadConnector: baseUrl.includes('leadconnectorhq.com'),
  };
}

export function isGoHighLevelPeskidsConfigured(
  env: Record<string, string | undefined> = process.env as Record<string, string | undefined>
): boolean {
  return resolveGoHighLevelPeskidsEnv(env).apiKey.length > 0;
}
