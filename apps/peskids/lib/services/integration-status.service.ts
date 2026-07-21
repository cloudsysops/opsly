import {
  isPeskidsGhlEnabled,
  resolveTwentyEnv,
} from '@intcloudsysops/services/twenty';
import { resolveWacrmServerUrl } from '@/lib/integrations/wacrm-admin-links';
import type { DashboardIntegrationStatus } from '../types';

type Env = Record<string, string | undefined>;

function trimUrl(base: string | undefined): string {
  return (base ?? '').trim().replace(/\/$/, '');
}

function healthFromWebhookBase(base: string): string {
  const normalized = base.replace(/\/$/, '');
  if (normalized.endsWith('/webhook')) {
    return `${normalized.replace(/\/webhook$/, '')}/healthz`;
  }
  return `${normalized}/healthz`;
}

async function probeHealth(
  url: string,
  timeoutMs = 1500
): Promise<{ ok: boolean; detail: string; checked_at: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const checkedAt = new Date().toISOString();
  try {
    const response = await fetch(url, {
      cache: 'no-store',
      signal: controller.signal,
    });
    return {
      ok: response.ok,
      detail: `healthz ${response.status}`,
      checked_at: checkedAt,
    };
  } catch (error) {
    return {
      ok: false,
      detail: error instanceof Error ? error.message : 'health probe failed',
      checked_at: checkedAt,
    };
  } finally {
    clearTimeout(timeout);
  }
}

function disabledItem(label: string, detail: string, checked_at: string): DashboardIntegrationStatus[keyof DashboardIntegrationStatus] {
  return {
    label,
    enabled: false,
    status: 'disabled',
    detail,
    url: null,
    checked_at,
  };
}

function enabledItem(
  label: string,
  url: string,
  ok: boolean,
  detail: string,
  checked_at: string
): DashboardIntegrationStatus[keyof DashboardIntegrationStatus] {
  return {
    label,
    enabled: true,
    status: ok ? 'ok' : 'warning',
    detail,
    url,
    checked_at,
  };
}

export async function fetchDashboardIntegrationStatus(
  env: Env = process.env as Env
): Promise<DashboardIntegrationStatus> {
  const checkedAt = new Date().toISOString();
  const twenty = resolveTwentyEnv(env);
  const n8nBase = trimUrl(env.N8N_WEBHOOK_BASE_URL);
  const wacrmBase = resolveWacrmServerUrl(env);
  const ghlEnabled = isPeskidsGhlEnabled(env);

  const [twentyHealth, n8nHealth, wacrmHealth] = await Promise.all([
    twenty.enabled && twenty.baseUrl
      ? probeHealth(`${twenty.baseUrl}/healthz`)
      : Promise.resolve(null),
    n8nBase ? probeHealth(healthFromWebhookBase(n8nBase)) : Promise.resolve(null),
    wacrmBase ? probeHealth(`${wacrmBase}/healthz`) : Promise.resolve(null),
  ]);

  return {
    twenty: twenty.enabled
      ? enabledItem(
          'Twenty',
          twenty.baseUrl,
          twentyHealth?.ok ?? false,
          twentyHealth ? twentyHealth.detail : 'Sin health check',
          twentyHealth?.checked_at ?? checkedAt
        )
      : disabledItem('Twenty', 'CRM no configurado (falta TWENTY_API_URL / TWENTY_API_KEY)', checkedAt),
    ghl: ghlEnabled
      ? {
          label: 'GHL',
          enabled: true,
          status: 'warning',
          detail: 'Legacy activo; no es la ruta actual de captación',
          url: null,
          checked_at: checkedAt,
        }
      : disabledItem('GHL', 'Ruta legacy apagada', checkedAt),
    n8n: n8nBase
      ? enabledItem(
          'n8n',
          n8nBase,
          n8nHealth?.ok ?? false,
          n8nHealth ? n8nHealth.detail : 'Sin health check',
          n8nHealth?.checked_at ?? checkedAt
        )
      : disabledItem('n8n', 'Automatización no configurada (falta N8N_WEBHOOK_BASE_URL)', checkedAt),
    wacrm: wacrmBase
      ? enabledItem(
          'WACRM',
          wacrmBase,
          wacrmHealth?.ok ?? false,
          wacrmHealth ? wacrmHealth.detail : 'Sin health check',
          wacrmHealth?.checked_at ?? checkedAt
        )
      : disabledItem('WACRM', 'Canal WhatsApp Business aún no activado', checkedAt),
  };
}
