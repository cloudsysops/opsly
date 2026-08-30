import { NextRequest, NextResponse } from 'next/server';
import {
  FranchiseSessionError,
  listAuthorizedFranchiseUnits,
  resolveCanonicalFranchiseSession,
} from '@/lib/franchise-session.server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { canonical, ui } = await resolveCanonicalFranchiseSession(request);
    const units = await listAuthorizedFranchiseUnits(canonical);
    return NextResponse.json({ tenant: ui.tenant, unitScope: ui.unitScope, units });
  } catch (error) {
    if (error instanceof FranchiseSessionError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('[GET /api/franchise/units]', error);
    return NextResponse.json({ error: 'Unable to load franchise units' }, { status: 500 });
  }
}
