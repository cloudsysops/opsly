import { NextRequest, NextResponse } from 'next/server';
import {
  FranchiseSessionError,
  resolveCanonicalFranchiseSession,
} from '@/lib/franchise-session.server';
import {
  canAccessCandidateCrm,
  CandidatePatchSchema,
  getCandidate,
  listCandidateEvents,
  updateCandidate,
} from '@/lib/candidate-service';

export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ id: string }> };

function errorResponse(error: unknown) {
  if (error instanceof FranchiseSessionError)
    return NextResponse.json({ error: error.message }, { status: error.status });
  return NextResponse.json(
    { error: error instanceof Error ? error.message : 'Unable to process candidate request' },
    { status: 500 }
  );
}

export async function GET(request: NextRequest, context: Context) {
  try {
    const { canonical } = await resolveCanonicalFranchiseSession(request);
    if (!canAccessCandidateCrm(canonical, 'read'))
      return NextResponse.json({ error: 'Candidate CRM access denied' }, { status: 403 });
    const { id } = await context.params;
    const candidate = await getCandidate(id);
    return candidate
      ? NextResponse.json({ candidate, events: await listCandidateEvents(id) })
      : NextResponse.json({ error: 'Candidate not found' }, { status: 404 });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: NextRequest, context: Context) {
  try {
    const { canonical } = await resolveCanonicalFranchiseSession(request);
    if (!canAccessCandidateCrm(canonical, 'write'))
      return NextResponse.json({ error: 'Candidate CRM write denied' }, { status: 403 });
    const { id } = await context.params;
    const parsed = CandidatePatchSchema.safeParse(await request.json());
    if (!parsed.success)
      return NextResponse.json(
        { error: 'Invalid candidate update', details: parsed.error.flatten() },
        { status: 422 }
      );
    const candidate = await updateCandidate(id, parsed.data, canonical.userId);
    return candidate
      ? NextResponse.json({ candidate })
      : NextResponse.json({ error: 'Candidate not found' }, { status: 404 });
  } catch (error) {
    return errorResponse(error);
  }
}
