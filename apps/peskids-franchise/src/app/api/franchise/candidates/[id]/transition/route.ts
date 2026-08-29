import { NextRequest, NextResponse } from 'next/server';
import {
  FranchiseSessionError,
  resolveCanonicalFranchiseSession,
} from '@/lib/franchise-session.server';
import {
  canAccessCandidateCrm,
  parseCandidateStatus,
  transitionCandidate,
} from '@/lib/candidate-service';

export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: Context) {
  try {
    const { canonical } = await resolveCanonicalFranchiseSession(request);
    if (!canAccessCandidateCrm(canonical, 'write'))
      return NextResponse.json({ error: 'Candidate CRM write denied' }, { status: 403 });
    const body = (await request.json()) as { status?: unknown };
    const status = parseCandidateStatus(body.status);
    if (!status) return NextResponse.json({ error: 'Invalid candidate status' }, { status: 422 });
    if (status === 'approved' && !canAccessCandidateCrm(canonical, 'approve'))
      return NextResponse.json({ error: 'Candidate approval denied' }, { status: 403 });
    const { id } = await context.params;
    const candidate = await transitionCandidate(id, status, canonical.userId);
    return candidate
      ? NextResponse.json({ candidate })
      : NextResponse.json({ error: 'Candidate not found' }, { status: 404 });
  } catch (error) {
    if (error instanceof FranchiseSessionError)
      return NextResponse.json({ error: error.message }, { status: error.status });
    const message = error instanceof Error ? error.message : 'Unable to transition candidate';
    return NextResponse.json(
      { error: message },
      { status: message.startsWith('Invalid candidate') ? 422 : 500 }
    );
  }
}
