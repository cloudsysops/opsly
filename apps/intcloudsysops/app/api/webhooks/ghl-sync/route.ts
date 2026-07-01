import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { syncAccountToGHL, syncContactToGHL, syncDealToGHL } from '@/lib/gohighlevel-sync';

const syncAccountSchema = z.object({
  type: z.literal('account'),
  data: z.object({
    name: z.string().min(1),
    accountType: z.enum(['prospect', 'customer', 'partner', 'vendor']),
    billingEmail: z.string().email().optional(),
    website: z.string().url().optional(),
    industry: z.string().optional(),
    employeeCount: z.number().int().positive().optional(),
  }),
});

const syncContactSchema = z.object({
  type: z.literal('contact'),
  data: z.object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    email: z.string().email(),
    phone: z.string().optional(),
    role: z.enum(['decision_maker', 'influencer', 'user', 'other']),
    accountId: z.string().uuid(),
  }),
});

const syncDealSchema = z.object({
  type: z.literal('deal'),
  data: z.object({
    title: z.string().min(1),
    accountId: z.string().uuid(),
    value: z.number().positive(),
    stage: z.enum(['lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost']),
    probability: z.number().min(0).max(100),
    closeDate: z.string().datetime().optional(),
    owner: z.string().min(1),
  }),
});

const syncPayloadSchema = z.union([syncAccountSchema, syncContactSchema, syncDealSchema]);

export async function POST(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') || crypto.randomUUID();

  try {
    const body = await request.json();
    const payload = syncPayloadSchema.parse(body);

    let result;

    if (payload.type === 'account') {
      result = await syncAccountToGHL(payload.data);
    } else if (payload.type === 'contact') {
      result = await syncContactToGHL(payload.data);
    } else if (payload.type === 'deal') {
      result = await syncDealToGHL(payload.data);
    }

    if (!result) {
      return NextResponse.json(
        { ok: false, error: 'GHL sync failed or not configured', request_id: requestId },
        { status: 503 },
      );
    }

    return NextResponse.json(
      { ok: true, data: result, request_id: requestId },
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Validation error',
          details: error.errors,
          request_id: requestId,
        },
        { status: 400 },
      );
    }

    console.error(`[${requestId}] ghl-sync webhook failed`, error);
    return NextResponse.json(
      { ok: false, error: 'Sync failed', request_id: requestId },
      { status: 500 },
    );
  }
}
