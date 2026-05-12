import type { IncomingMessage, ServerResponse } from 'node:http';
import { jsonResponse, errorResponse } from '../router.js';
import { ValidationDashboard } from '../../lib/validation-dashboard.js';

export async function handleValidationMetrics(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  try {
    const dashboard = new ValidationDashboard();
    const metrics = await dashboard.getMetrics();
    return jsonResponse(res, metrics);
  } catch (err) {
    return errorResponse(res, String(err), 500);
  }
}

export async function handleValidationMetricsByAgent(
  req: IncomingMessage,
  res: ServerResponse,
  agentRole: string
): Promise<void> {
  if (!agentRole) {
    return errorResponse(res, 'agent_role required', 400);
  }
  try {
    const dashboard = new ValidationDashboard();
    const metrics = await dashboard.getAgentMetrics(agentRole);
    return jsonResponse(res, metrics);
  } catch (err) {
    return errorResponse(res, String(err), 500);
  }
}

export async function handleValidationMetricsByIntent(
  req: IncomingMessage,
  res: ServerResponse,
  intent: string
): Promise<void> {
  if (!intent) {
    return errorResponse(res, 'intent required', 400);
  }
  try {
    const dashboard = new ValidationDashboard();
    const metrics = await dashboard.getIntentMetrics(intent);
    return jsonResponse(res, metrics);
  } catch (err) {
    return errorResponse(res, String(err), 500);
  }
}

export async function handleValidationExport(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  try {
    const dashboard = new ValidationDashboard();
    const metrics = await dashboard.exportMetricsForAnalytics();
    return jsonResponse(res, metrics);
  } catch (err) {
    return errorResponse(res, String(err), 500);
  }
}