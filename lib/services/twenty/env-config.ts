export const TWENTY_DEFAULT_API_PATH = '/rest';

export interface TwentyEnvConfig {
  apiKey: string;
  baseUrl: string;
  defaultOpportunityStage: string;
  enabled: boolean;
}

function parseBooleanFlag(
  value: string | undefined,
  defaultWhenUnset: boolean
): boolean {
  if (value === undefined || value.trim() === '') {
    return defaultWhenUnset;
  }
  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) {
    return true;
  }
  if (['0', 'false', 'no', 'off'].includes(normalized)) {
    return false;
  }
  return defaultWhenUnset;
}

export function resolveTwentyEnv(
  env: Record<string, string | undefined> = process.env as Record<string, string | undefined>
): TwentyEnvConfig {
  const apiKey = env.TWENTY_API_KEY?.trim() || env.TWENTY_PESKIDS_API_KEY?.trim() || '';
  const baseUrl = (
    env.TWENTY_API_URL?.trim() ||
    env.TWENTY_PESKIDS_API_URL?.trim() ||
    ''
  ).replace(/\/$/, '');
  const configured = apiKey.length > 0 && baseUrl.length > 0;
  const enabled =
    configured &&
    parseBooleanFlag(env.PESKIDS_TWENTY_ENABLED ?? env.TWENTY_ENABLED, true);

  return {
    apiKey,
    baseUrl,
    defaultOpportunityStage:
      env.TWENTY_DEFAULT_OPPORTUNITY_STAGE?.trim() ||
      env.TWENTY_PESKIDS_DEFAULT_OPPORTUNITY_STAGE?.trim() ||
      'NEW',
    enabled,
  };
}

export function isTwentyConfigured(
  env: Record<string, string | undefined> = process.env as Record<string, string | undefined>
): boolean {
  return resolveTwentyEnv(env).enabled;
}

/** Explicit opt-in after migration off GoHighLevel. */
export function isPeskidsGhlEnabled(
  env: Record<string, string | undefined> = process.env as Record<string, string | undefined>
): boolean {
  return parseBooleanFlag(env.PESKIDS_GHL_ENABLED, false);
}

export function resolveTwentyEnvForIntcloudsysops(
  env: Record<string, string | undefined> = process.env as Record<string, string | undefined>
): TwentyEnvConfig {
  const apiKey =
    env.TWENTY_INTCLOUDSYSOPS_API_KEY?.trim() ||
    env.TWENTY_API_KEY?.trim() ||
    '';
  const baseUrl = (
    env.TWENTY_INTCLOUDSYSOPS_API_URL?.trim() ||
    env.TWENTY_API_URL?.trim() ||
    ''
  ).replace(/\/$/, '');
  const configured = apiKey.length > 0 && baseUrl.length > 0;
  const enabled =
    configured &&
    parseBooleanFlag(
      env.INTCLOUDSYSOPS_TWENTY_ENABLED ?? env.TWENTY_ENABLED,
      true
    );

  return {
    apiKey,
    baseUrl,
    defaultOpportunityStage:
      env.TWENTY_INTCLOUDSYSOPS_DEFAULT_OPPORTUNITY_STAGE?.trim() ||
      env.TWENTY_DEFAULT_OPPORTUNITY_STAGE?.trim() ||
      'NEW',
    enabled,
  };
}

export function isIntcloudsysopsTwentyConfigured(
  env: Record<string, string | undefined> = process.env as Record<string, string | undefined>
): boolean {
  return resolveTwentyEnvForIntcloudsysops(env).enabled;
}

/** Explicit opt-in for legacy GoHighLevel sidecar (agency location). */
export function isIntcloudsysopsGhlEnabled(
  env: Record<string, string | undefined> = process.env as Record<string, string | undefined>
): boolean {
  return parseBooleanFlag(env.INTCLOUDSYSOPS_GHL_ENABLED, false);
}
