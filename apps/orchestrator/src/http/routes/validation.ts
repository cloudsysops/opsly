import type { RouteContext } from '../router.js';
import { ValidationDashboard } from '../../lib/validation-dashboard.js';
import { jsonResponse, errorResponse } from '../router.js';

export async function handleValidationMetrics(ctx: RouteContext): Promise<void> {
  try {
    const dashboard = new ValidationDashboard();
    const metrics = await dashboard.getMetrics();
    jsonResponse(ctx.res, 200, metrics);
  } catch (err) {
    errorResponse(ctx.res, 500, String(err));
  }
}

export async function handleValidationMetricsByAgent(ctx: RouteContext): Promise<void> {
  const agentRole = ctx.params['agentRole']?.trim() ?? '';
  if (agentRole.length === 0) {
    errorResponse(ctx.res, 400, 'agent_role required');
    return;
  }
  try {
    const dashboard = new ValidationDashboard();
    const metrics = await dashboard.getAgentMetrics(agentRole);
    jsonResponse(ctx.res, 200, metrics);
  } catch (err) {
    errorResponse(ctx.res, 500, String(err));
  }
}

export async function handleValidationMetricsByIntent(ctx: RouteContext): Promise<void> {
  const intent = ctx.params['intent']?.trim() ?? '';
  if (intent.length === 0) {
    errorResponse(ctx.res, 400, 'intent required');
    return;
  }
  try {
    const dashboard = new ValidationDashboard();
    const metrics = await dashboard.getIntentMetrics(intent);
    jsonResponse(ctx.res, 200, metrics);
  } catch (err) {
    errorResponse(ctx.res, 500, String(err));
  }
}

export async function handleValidationExport(ctx: RouteContext): Promise<void> {
  try {
    const dashboard = new ValidationDashboard();
    const metrics = await dashboard.exportMetricsForAnalytics();
    jsonResponse(ctx.res, 200, metrics);
  } catch (err) {
    errorResponse(ctx.res, 500, String(err));
  }
}
