import { NextRequest, NextResponse } from 'next/server';
import {
  FranchiseSessionError,
  resolveCanonicalFranchiseSession,
} from '@/lib/franchise-session.server';
import { canAccessCandidateCrm, transitionCandidate } from '@/lib/candidate-service';

export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: Context) {
  try {
    const { canonical } = await resolveCanonicalFranchiseSession(request);
    if (!canAccessCandidateCrm(canonical, 'approve'))
      return NextResponse.json({ error: 'Candidate approval denied' }, { status: 403 });
    const { id } = await context.params;
    const candidate = await transitionCandidate(id, 'approved', canonical.userId);
    return candidate
      ? NextResponse.json({ candidate })
      : NextResponse.json({ error: 'Candidate not found' }, { status: 404 });
  } catch (error) {
    if (error instanceof FranchiseSessionError)
      return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to approve candidate' },
      { status: 422 }
    );
  }
}
