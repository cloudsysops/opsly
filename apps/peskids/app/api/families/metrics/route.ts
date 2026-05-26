import { NextRequest, NextResponse } from 'next/server'
import { loadPeskidsBiSnapshot } from '../../../../lib/bi-snapshot'
import { validateFamilyRequest } from '@/lib/family-auth'
import { createFormSubmissionService } from '@/lib/services/form-submission.service'
import { buildFamilyRoleMetrics } from '@/lib/role-metrics'
import { supabaseServer } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const auth = await validateFamilyRequest(req)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const parentEmail = auth.user.email?.trim() ?? ''
  if (!parentEmail) {
    return NextResponse.json({ error: 'Family email not found in session' }, { status: 400 })
  }

  const tenantId = process.env.NEXT_PUBLIC_TENANT_ID || 'peskids'
  const snapshot = await loadPeskidsBiSnapshot()
  const snapshotMetrics = snapshot?.families.byParentEmail[parentEmail.toLowerCase()]
  if (snapshotMetrics) {
    return NextResponse.json({
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
    return NextResponse.json({ error: 'Failed to fetch family metrics' }, { status: 500 })
  }

  const metrics = await buildFamilyRoleMetrics(submissions, feedbackResult.data ?? [])

  return NextResponse.json({
    parentEmail,
    tenantId,
    metrics,
  })
}
