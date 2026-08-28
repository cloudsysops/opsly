import { NextRequest, NextResponse } from 'next/server';
import {
  FranchiseSessionError,
  resolveCanonicalFranchiseSession,
} from '@/lib/franchise-session.server';
import { canAccessCandidateCrm, convertCandidate } from '@/lib/candidate-service';

export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: Context) {
  try {
    const { canonical } = await resolveCanonicalFranchiseSession(request);
    if (!canAccessCandidateCrm(canonical, 'approve'))
      return NextResponse.json({ error: 'Candidate conversion denied' }, { status: 403 });
    const { id } = await context.params;
    return NextResponse.json({ conversion: await convertCandidate(id, canonical.userId) });
  } catch (error) {
    if (error instanceof FranchiseSessionError)
      return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to convert candidate' },
      { status: 422 }
    );
  }
}
