import type {
  MissionControlExecutionActivityV1,
  MissionControlExecutionProjectionV1,
} from './mission-control-execution-activity-v1';

const SECRET_PATTERNS: RegExp[] = [
  /\bBearer\s+[A-Za-z0-9._~+/=-]+/gi,
  /\b(?:sk|pk|rk)-(?:live|test|proj)?[-_A-Za-z0-9]{12,}\b/gi,
  /\bgh[pousr]_[A-Za-z0-9]{20,}\b/g,
  /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g,
  /\b(?:api[_-]?key|token|secret|password|passwd|authorization)\s*[:=]\s*[^\s,;]+/gi,
];

const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const PHONE_PATTERN = /(?<!\w)(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]?\d{4}(?!\w)/g;
const TENANT_PATTERN = /\b(tenant(?:_slug)?)(\s*[:=\/\-]\s*)([a-z0-9][a-z0-9_-]{1,63})\b/gi;

function stableAlias(value: string): string {
  let hash = 2166136261;
  for (const ch of value.toLowerCase()) {
    hash ^= ch.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  const number = (hash >>> 0) % 10000;
  return `ORBIT-${number.toString().padStart(4, '0')}`;
}

export function aliasTenantIdentifier(value: string | null | undefined): string | null {
  if (!value) return null;
  return stableAlias(value);
}

function sanitizeUrl(raw: string): string {
  try {
    const parsed = new URL(raw);
    parsed.username = '';
    parsed.password = '';
    parsed.search = '';
    parsed.hash = '';
    return parsed.toString();
  } catch {
    return raw;
  }
}

export function streamSafeText(value: string | null | undefined): string | null {
  if (!value) return value ?? null;

  let result = value;

  // URL sanitization runs FIRST, on the original text, via proper URL parsing.
  // Running it after the generic patterns below let userinfo/query fragments
  // (e.g. `user:pass@host`, `?session=xyz`) survive when they didn't happen to
  // look like an email or match the fixed secret-keyword list — `new URL()`
  // strips username/password/search/hash unconditionally, regardless of naming.
  result = result.replace(/https?:\/\/[^\s)\]}>,]+/gi, (url) => sanitizeUrl(url));

  for (const pattern of SECRET_PATTERNS) {
    result = result.replace(pattern, '[REDACTED]');
  }

  result = result.replace(EMAIL_PATTERN, '[EMAIL REDACTED]');
  result = result.replace(PHONE_PATTERN, '[PHONE REDACTED]');
  result = result.replace(TENANT_PATTERN, (_match, label: string, separator: string, tenant: string) => {
    return `${label}${separator}${stableAlias(tenant)}`;
  });

  return result;
}

function sanitizeActivity(activity: MissionControlExecutionActivityV1): MissionControlExecutionActivityV1 {
  return {
    ...activity,
    work_id: streamSafeText(activity.work_id) ?? '[REDACTED]',
    agent_id: streamSafeText(activity.agent_id) ?? 'unknown-agent',
    machine: streamSafeText(activity.machine),
    workstream: streamSafeText(activity.workstream),
    conflict_key: streamSafeText(activity.conflict_key),
    branch: streamSafeText(activity.branch),
    pr_url: streamSafeText(activity.pr_url),
    blocker: streamSafeText(activity.blocker),
    source_id: streamSafeText(activity.source_id) ?? 'unknown-source',
  };
}

export function buildStreamSafeMissionControlProjection(
  projection: MissionControlExecutionProjectionV1
): MissionControlExecutionProjectionV1 {
  return {
    ...projection,
    sources: projection.sources.map((source) => ({
      ...source,
      source_id: streamSafeText(source.source_id) ?? 'unknown-source',
      detail: streamSafeText(source.detail) ?? 'details unavailable',
    })),
    activities: projection.activities.map(sanitizeActivity),
  };
}

export function containsUnsafeStreamMaterial(value: string): boolean {
  if (EMAIL_PATTERN.test(value) || PHONE_PATTERN.test(value)) return true;
  EMAIL_PATTERN.lastIndex = 0;
  PHONE_PATTERN.lastIndex = 0;

  for (const pattern of SECRET_PATTERNS) {
    pattern.lastIndex = 0;
    if (pattern.test(value)) {
      pattern.lastIndex = 0;
      return true;
    }
  }
  return false;
}
