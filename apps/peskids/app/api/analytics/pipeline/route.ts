import { type NextRequest, NextResponse } from 'next/server';
import { errorJson, resolveRequestId, successJson } from '@/lib/api-response';
import { validateStaffRequest } from '@/lib/staff-auth';
import { PipelineAnalyticsService } from '@/lib/analytics/pipeline-analytics.service';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const requestId = resolveRequestId(req);

  try {
    const auth = await validateStaffRequest(req);
    if (!auth.ok) {
      return errorJson(requestId, auth.error, auth.status);
    }

    const service = new PipelineAnalyticsService();
    const metrics = await service.getPipelineMetrics();
    const sourceBreakdown = await service.getLeadSourceBreakdown();
    const revenueAttribution = await service.getRevenueAttribution();

    return successJson(requestId, {
      metrics,
      sourceBreakdown,
      revenueAttribution,
      summary: {
        totalLeads: metrics.totalLeads,
        crmConfigured: metrics.crmConfigured,
        crmError: metrics.crmError,
      },
    });
  } catch (error) {
    console.error('Pipeline analytics API error:', error, { request_id: requestId });
    return errorJson(requestId, 'Failed to fetch pipeline analytics', 500);
  }
}
