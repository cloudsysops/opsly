export type ApiSurfaceApp = 'control' | 'admin-local' | 'portal-local' | 'web-local';

export type ApiSurfaceCategory =
  | 'admin'
  | 'agents'
  | 'billing'
  | 'cron'
  | 'feedback'
  | 'health'
  | 'infra'
  | 'internal'
  | 'n8n'
  | 'portal'
  | 'public'
  | 'tenants'
  | 'tools'
  | 'webhooks';

export interface ApiEndpoint {
  app: ApiSurfaceApp;
  methods: string[];
  path: string;
  file: string;
}

export const API_ENDPOINTS: ApiEndpoint[] = [
  { app: 'control', methods: ['GET'], path: '/api/admin/audit', file: 'apps/api/app/api/admin/audit/route.ts' },
  { app: 'control', methods: ['GET'], path: '/api/admin/billing/llm-costs', file: 'apps/api/app/api/admin/billing/llm-costs/route.ts' },
  { app: 'control', methods: ['GET', 'POST'], path: '/api/admin/costs', file: 'apps/api/app/api/admin/costs/route.ts' },
  { app: 'control', methods: ['GET'], path: '/api/admin/docker/containers', file: 'apps/api/app/api/admin/docker/containers/route.ts' },
  { app: 'control', methods: ['GET'], path: '/api/admin/metrics', file: 'apps/api/app/api/admin/metrics/route.ts' },
  { app: 'control', methods: ['GET'], path: '/api/admin/metrics/ollama', file: 'apps/api/app/api/admin/metrics/ollama/route.ts' },
  { app: 'control', methods: ['GET'], path: '/api/admin/mission-control/openclaw', file: 'apps/api/app/api/admin/mission-control/openclaw/route.ts' },
  { app: 'control', methods: ['POST'], path: '/api/admin/mission-control/openclaw/execute', file: 'apps/api/app/api/admin/mission-control/openclaw/execute/route.ts' },
  { app: 'control', methods: ['GET'], path: '/api/admin/mission-control/orchestrator', file: 'apps/api/app/api/admin/mission-control/orchestrator/route.ts' },
  { app: 'control', methods: ['GET'], path: '/api/admin/mission-control/teams', file: 'apps/api/app/api/admin/mission-control/teams/route.ts' },
  { app: 'control', methods: ['POST', 'GET'], path: '/api/admin/ollama-demo', file: 'apps/api/app/api/admin/ollama-demo/route.ts' },
  { app: 'control', methods: ['GET'], path: '/api/admin/overview', file: 'apps/api/app/api/admin/overview/route.ts' },
  { app: 'control', methods: ['GET'], path: '/api/admin/tenants', file: 'apps/api/app/api/admin/tenants/route.ts' },
  { app: 'control', methods: ['GET'], path: '/api/agents/team', file: 'apps/api/app/api/agents/team/route.ts' },
  { app: 'control', methods: ['POST'], path: '/api/backup', file: 'apps/api/app/api/backup/route.ts' },
  { app: 'control', methods: ['POST'], path: '/api/billing/create-invoice', file: 'apps/api/app/api/billing/create-invoice/route.ts' },
  { app: 'control', methods: ['GET', 'PATCH'], path: '/api/billing/invoices/:id', file: 'apps/api/app/api/billing/invoices/[id]/route.ts' },
  { app: 'control', methods: ['GET', 'POST'], path: '/api/billing/invoices', file: 'apps/api/app/api/billing/invoices/route.ts' },
  { app: 'control', methods: ['GET', 'POST'], path: '/api/billing/metering-events', file: 'apps/api/app/api/billing/metering-events/route.ts' },
  { app: 'control', methods: ['POST'], path: '/api/billing/stripe-webhook', file: 'apps/api/app/api/billing/stripe-webhook/route.ts' },
  { app: 'control', methods: ['GET', 'POST', 'DELETE'], path: '/api/billing/subscriptions', file: 'apps/api/app/api/billing/subscriptions/route.ts' },
  { app: 'control', methods: ['POST'], path: '/api/checkout/session', file: 'apps/api/app/api/checkout/session/route.ts' },
  { app: 'control', methods: ['GET', 'POST'], path: '/api/cron/flush-billing', file: 'apps/api/app/api/cron/flush-billing/route.ts' },
  { app: 'control', methods: ['GET', 'POST'], path: '/api/cron/generate-insights', file: 'apps/api/app/api/cron/generate-insights/route.ts' },
  { app: 'control', methods: ['GET', 'POST'], path: '/api/cron/sync-stripe-usage', file: 'apps/api/app/api/cron/sync-stripe-usage/route.ts' },
  { app: 'control', methods: ['GET'], path: '/api/docs', file: 'apps/api/app/api/docs/route.ts' },
  { app: 'control', methods: ['POST'], path: '/api/feedback/approve', file: 'apps/api/app/api/feedback/approve/route.ts' },
  { app: 'control', methods: ['POST', 'GET'], path: '/api/feedback', file: 'apps/api/app/api/feedback/route.ts' },
  { app: 'control', methods: ['GET', 'POST'], path: '/api/growth/outreach-template', file: 'apps/api/app/api/growth/outreach-template/route.ts' },
  { app: 'control', methods: ['GET'], path: '/api/health/lightweight', file: 'apps/api/app/api/health/lightweight/route.ts' },
  { app: 'control', methods: ['GET'], path: '/api/health', file: 'apps/api/app/api/health/route.ts' },
  { app: 'control', methods: ['GET'], path: '/api/hermes/metrics', file: 'apps/api/app/api/hermes/metrics/route.ts' },
  { app: 'control', methods: ['POST'], path: '/api/infra/heartbeat', file: 'apps/api/app/api/infra/heartbeat/route.ts' },
  { app: 'control', methods: ['GET'], path: '/api/infra/status', file: 'apps/api/app/api/infra/status/route.ts' },
  { app: 'control', methods: ['POST'], path: '/api/internal/budget-enforce', file: 'apps/api/app/api/internal/budget-enforce/route.ts' },
  { app: 'control', methods: ['POST', 'GET', 'PATCH'], path: '/api/internal/help-request', file: 'apps/api/app/api/internal/help-request/route.ts' },
  { app: 'control', methods: ['POST'], path: '/api/invitations', file: 'apps/api/app/api/invitations/route.ts' },
  { app: 'control', methods: ['GET'], path: '/api/metrics', file: 'apps/api/app/api/metrics/route.ts' },
  { app: 'control', methods: ['GET'], path: '/api/metrics/system', file: 'apps/api/app/api/metrics/system/route.ts' },
  { app: 'control', methods: ['GET'], path: '/api/metrics/teams', file: 'apps/api/app/api/metrics/teams/route.ts' },
  { app: 'control', methods: ['GET'], path: '/api/metrics/tenant/:slug', file: 'apps/api/app/api/metrics/tenant/[slug]/route.ts' },
  { app: 'control', methods: ['GET'], path: '/api/monitoring/mac2011', file: 'apps/api/app/api/monitoring/mac2011/route.ts' },
  { app: 'control', methods: ['POST'], path: '/api/n8n/decide', file: 'apps/api/app/api/n8n/decide/route.ts' },
  { app: 'control', methods: ['POST'], path: '/api/n8n/execute', file: 'apps/api/app/api/n8n/execute/route.ts' },
  { app: 'control', methods: ['POST'], path: '/api/notebooklm/query', file: 'apps/api/app/api/notebooklm/query/route.ts' },
  { app: 'control', methods: ['GET'], path: '/api/portal/billing/summary', file: 'apps/api/app/api/portal/billing/summary/route.ts' },
  { app: 'control', methods: ['GET'], path: '/api/portal/health', file: 'apps/api/app/api/portal/health/route.ts' },
  { app: 'control', methods: ['GET'], path: '/api/portal/me', file: 'apps/api/app/api/portal/me/route.ts' },
  { app: 'control', methods: ['POST'], path: '/api/portal/mode', file: 'apps/api/app/api/portal/mode/route.ts' },
  { app: 'control', methods: ['POST'], path: '/api/portal/onboarding', file: 'apps/api/app/api/portal/onboarding/route.ts' },
  { app: 'control', methods: ['GET', 'PUT'], path: '/api/portal/tenant/:slug/budget', file: 'apps/api/app/api/portal/tenant/[slug]/budget/route.ts' },
  { app: 'control', methods: ['GET'], path: '/api/portal/tenant/:slug/health', file: 'apps/api/app/api/portal/tenant/[slug]/health/route.ts' },
  { app: 'control', methods: ['GET', 'PATCH'], path: '/api/portal/tenant/:slug/insights', file: 'apps/api/app/api/portal/tenant/[slug]/insights/route.ts' },
  { app: 'control', methods: ['GET'], path: '/api/portal/tenant/:slug/me', file: 'apps/api/app/api/portal/tenant/[slug]/me/route.ts' },
  { app: 'control', methods: ['POST'], path: '/api/portal/tenant/:slug/mode', file: 'apps/api/app/api/portal/tenant/[slug]/mode/route.ts' },
  { app: 'control', methods: ['POST'], path: '/api/portal/tenant/:slug/subscription/upgrade', file: 'apps/api/app/api/portal/tenant/[slug]/subscription/upgrade/route.ts' },
  { app: 'control', methods: ['GET'], path: '/api/portal/tenant/:slug/usage', file: 'apps/api/app/api/portal/tenant/[slug]/usage/route.ts' },
  { app: 'control', methods: ['GET'], path: '/api/portal/usage', file: 'apps/api/app/api/portal/usage/route.ts' },
  { app: 'control', methods: ['POST'], path: '/api/provisioning/quote', file: 'apps/api/app/api/provisioning/quote/route.ts' },
  { app: 'control', methods: ['GET'], path: '/api/sprints/active', file: 'apps/api/app/api/sprints/active/route.ts' },
  { app: 'control', methods: ['POST'], path: '/api/tenants/:ref/resume', file: 'apps/api/app/api/tenants/[ref]/resume/route.ts' },
  { app: 'control', methods: ['GET', 'PATCH', 'DELETE'], path: '/api/tenants/:ref', file: 'apps/api/app/api/tenants/[ref]/route.ts' },
  { app: 'control', methods: ['POST'], path: '/api/tenants/:ref/suspend', file: 'apps/api/app/api/tenants/[ref]/suspend/route.ts' },
  { app: 'control', methods: ['DELETE'], path: '/api/tenants/:ref/webhooks/:webhookId', file: 'apps/api/app/api/tenants/[ref]/webhooks/[webhookId]/route.ts' },
  { app: 'control', methods: ['GET', 'POST'], path: '/api/tenants/:ref/webhooks', file: 'apps/api/app/api/tenants/[ref]/webhooks/route.ts' },
  { app: 'control', methods: ['GET', 'POST'], path: '/api/tenants', file: 'apps/api/app/api/tenants/route.ts' },
  { app: 'control', methods: ['POST'], path: '/api/tools/execute', file: 'apps/api/app/api/tools/execute/route.ts' },
  { app: 'control', methods: ['GET'], path: '/api/v1', file: 'apps/api/app/api/v1/route.ts' },
  { app: 'control', methods: ['POST'], path: '/api/webhooks/stripe', file: 'apps/api/app/api/webhooks/stripe/route.ts' },
  { app: 'admin-local', methods: ['GET'], path: '/api/approval-decisions', file: 'apps/admin/app/api/approval-decisions/route.ts' },
  { app: 'admin-local', methods: ['GET'], path: '/api/audit-log', file: 'apps/admin/app/api/audit-log/route.ts' },
  { app: 'admin-local', methods: ['POST'], path: '/api/backup', file: 'apps/admin/app/api/backup/route.ts' },
  { app: 'admin-local', methods: ['GET'], path: '/api/health', file: 'apps/admin/app/api/health/route.ts' },
  { app: 'portal-local', methods: ['GET'], path: '/api/health', file: 'apps/portal/app/api/health/route.ts' },
  { app: 'portal-local', methods: ['GET'], path: '/api/sprints/active', file: 'apps/portal/app/api/sprints/active/route.ts' },
  { app: 'web-local', methods: ['GET'], path: '/api/health', file: 'apps/web/app/api/health/route.ts' },
  { app: 'web-local', methods: ['GET'], path: '/api/metrics', file: 'apps/web/app/api/metrics/route.ts' },
  { app: 'web-local', methods: ['GET'], path: '/api/public/tenants/status', file: 'apps/web/app/api/public/tenants/status/route.ts' },
  { app: 'web-local', methods: ['POST'], path: '/api/tenants/:id/resume', file: 'apps/web/app/api/tenants/[id]/resume/route.ts' },
  { app: 'web-local', methods: ['GET', 'PATCH', 'DELETE'], path: '/api/tenants/:id', file: 'apps/web/app/api/tenants/[id]/route.ts' },
  { app: 'web-local', methods: ['POST'], path: '/api/tenants/:id/suspend', file: 'apps/web/app/api/tenants/[id]/suspend/route.ts' },
  { app: 'web-local', methods: ['GET', 'POST'], path: '/api/tenants', file: 'apps/web/app/api/tenants/route.ts' },
  { app: 'web-local', methods: ['DELETE'], path: '/api/v1/keys/:id', file: 'apps/web/app/api/v1/keys/[id]/route.ts' },
  { app: 'web-local', methods: ['GET', 'POST'], path: '/api/v1/keys', file: 'apps/web/app/api/v1/keys/route.ts' },
  { app: 'web-local', methods: ['POST'], path: '/api/webhooks/stripe', file: 'apps/web/app/api/webhooks/stripe/route.ts' },
];

export function categorizeEndpoint(path: string): ApiSurfaceCategory {
  if (path.startsWith('/api/admin')) return 'admin';
  if (path.startsWith('/api/agents')) return 'agents';
  if (path.startsWith('/api/billing') || path.startsWith('/api/checkout')) return 'billing';
  if (path.startsWith('/api/cron')) return 'cron';
  if (path.startsWith('/api/feedback')) return 'feedback';
  if (path.includes('/health') || path.startsWith('/api/metrics') || path.startsWith('/api/hermes')) {
    return 'health';
  }
  if (path.startsWith('/api/infra') || path.startsWith('/api/monitoring')) return 'infra';
  if (path.startsWith('/api/internal')) return 'internal';
  if (path.startsWith('/api/n8n')) return 'n8n';
  if (path.startsWith('/api/portal')) return 'portal';
  if (path.startsWith('/api/public') || path === '/api/docs' || path === '/api/v1') return 'public';
  if (path.startsWith('/api/tenants') || path.startsWith('/api/invitations') || path.startsWith('/api/provisioning')) {
    return 'tenants';
  }
  if (path.startsWith('/api/tools') || path.startsWith('/api/notebooklm') || path.startsWith('/api/growth')) return 'tools';
  return 'webhooks';
}

export function isMutation(methods: string[]): boolean {
  return methods.some((method) => method !== 'GET' && method !== 'HEAD');
}

export function endpointRisk(endpoint: ApiEndpoint): 'low' | 'medium' | 'high' {
  const category = categorizeEndpoint(endpoint.path);
  if (category === 'internal' || category === 'webhooks') return 'high';
  if (category === 'admin' || category === 'billing' || category === 'tenants') {
    return isMutation(endpoint.methods) ? 'high' : 'medium';
  }
  if (category === 'portal') return isMutation(endpoint.methods) ? 'medium' : 'low';
  return isMutation(endpoint.methods) ? 'medium' : 'low';
}

