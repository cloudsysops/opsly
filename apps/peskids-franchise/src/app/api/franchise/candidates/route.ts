import { NextRequest, NextResponse } from 'next/server';
import {
  FranchiseSessionError,
  resolveCanonicalFranchiseSession,
} from '@/lib/franchise-session.server';
import {
  canAccessCandidateCrm,
  CandidateInputSchema,
  createCandidate,
  listCandidates,
  parseCandidateStatus,
} from '@/lib/candidate-service';

export const dynamic = 'force-dynamic';

function errorResponse(error: unknown) {
  if (error instanceof FranchiseSessionError)
    return NextResponse.json({ error: error.message }, { status: error.status });
  if (error instanceof Error && error.message.startsWith('Invalid candidate'))
    return NextResponse.json({ error: error.message }, { status: 422 });
  return NextResponse.json({ error: 'Unable to process candidate request' }, { status: 500 });
}

export async function GET(request: NextRequest) {
  try {
    const { canonical } = await resolveCanonicalFranchiseSession(request);
    if (!canAccessCandidateCrm(canonical, 'read'))
      return NextResponse.json({ error: 'Candidate CRM access denied' }, { status: 403 });
    const status = parseCandidateStatus(request.nextUrl.searchParams.get('status'));
    return NextResponse.json({ tenant: 'peskids', candidates: await listCandidates(status) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { canonical } = await resolveCanonicalFranchiseSession(request);
    if (!canAccessCandidateCrm(canonical, 'write'))
      return NextResponse.json({ error: 'Candidate CRM write denied' }, { status: 403 });
    const parsed = CandidateInputSchema.safeParse(await request.json());
    if (!parsed.success)
      return NextResponse.json(
        { error: 'Invalid candidate input', details: parsed.error.flatten() },
        { status: 422 }
      );
    return NextResponse.json(
      { candidate: await createCandidate(parsed.data, canonical.userId) },
      { status: 201 }
    );
  } catch (error) {
    return errorResponse(error);
  }
}
