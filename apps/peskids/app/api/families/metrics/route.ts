import { NextRequest } from 'next/server'
import { loadPeskidsBiSnapshot } from '../../../../lib/bi-snapshot'
import { validateFamilyRequest } from '@/lib/family-auth'
import { createFormSubmissionService } from '@/lib/services/form-submission.service'
import { buildFamilyRoleMetrics } from '@/lib/role-metrics'
import { supabaseServer } from '@/lib/supabase'
import { errorJson, resolveRequestId, successJson } from '@/lib/api-response'

export async function GET(req: NextRequest) {
  const requestId = resolveRequestId(req)
  const auth = await validateFamilyRequest(req)
  if (!auth.ok) {
    return errorJson(requestId, auth.error, auth.status)
  }

  const parentEmail = auth.user.email?.trim() ?? ''
  if (!parentEmail) {
    return errorJson(requestId, 'Family email not found in session', 400)
  }

  const tenantId = process.env.NEXT_PUBLIC_TENANT_ID || 'peskids'
  const snapshot = await loadPeskidsBiSnapshot()
  const snapshotMetrics = snapshot?.families.byParentEmail[parentEmail.toLowerCase()]
  if (snapshotMetrics) {
    return successJson(requestId, {
      parentEmail,
      tenantId,
      metrics: snapshotMetrics,
    })
  }

  const service = createFormSubmissionService()
  const submissions = await service.getParentSubmissions(parentEmail)

  const supabase = supabaseServer()
  const feedbackResult = await supabase
    .from('feedback')
    .select('visibility, audience, satisfaction, created_at')
    .eq('tenant_id', tenantId)
    .eq('parent_email', parentEmail)
    .order('created_at', { ascending: false })
    .limit(20)

  if (feedbackResult.error) {
    return errorJson(requestId, 'Failed to fetch family metrics', 500)
  }

  const metrics = await buildFamilyRoleMetrics(submissions, feedbackResult.data ?? [])

  return successJson(requestId, {
    parentEmail,
    tenantId,
    metrics,
  })
}
