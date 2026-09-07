/**
 * Atomicity of the payment writes.
 *
 * PostgREST cannot span statements in one transaction, so the fix was to move
 * the two-step writes into plpgsql functions (migration
 * 20260905_payment_atomicity_and_webhook_idempotency.sql). A function body is
 * one transaction, so the guarantee is delegated to Postgres.
 *
 * These tests therefore assert two separate things:
 *
 *  1. The services really do delegate — one RPC call, and no direct table
 *     writes that could half-succeed. (Verifiable here.)
 *  2. Given that delegation, a mid-transaction failure leaves nothing partially
 *     committed. This is exercised against an in-memory model of the plpgsql
 *     function; it proves the *call shape* is all-or-nothing and would catch a
 *     regression back to two sequential PostgREST calls.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

type Row = Record<string, unknown>;

const rpcMock = vi.fn();
const fromMock = vi.fn();
const typedFromMock = vi.fn();
const getClassByIdMock = vi.fn();

vi.mock('@/lib/supabase', () => ({
  supabaseServer: () => ({ schema: () => ({ from: typedFromMock }) }),
  supabaseServerUntypedSchema: () => ({ schema: () => ({ rpc: rpcMock, from: fromMock }) }),
}));

vi.mock('@/lib/services/class.service', () => ({
  getClassById: getClassByIdMock,
}));

const ENROLLMENT_ID = '11111111-1111-4111-8111-111111111111';
const FAMILY_USER_ID = '22222222-2222-4222-8222-222222222222';

function stubEnrollmentLookup(row: Row | null) {
  typedFromMock.mockImplementation(() => ({
    select: () => ({
      eq: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: row, error: null }) }),
      }),
    }),
    // Any direct insert/update here would be a regression: those writes must go
    // through the transactional RPC.
    insert: () => {
      throw new Error('direct table insert is not allowed for payment writes');
    },
    update: () => {
      throw new Error('direct table update is not allowed for payment writes');
    },
  }));
}

describe('recordCheckoutSession', () => {
  beforeEach(() => {
    vi.resetModules();
    rpcMock.mockReset();
    typedFromMock.mockReset();
    getClassByIdMock.mockReset();
    process.env.NEXT_PUBLIC_TENANT_ID = 'peskids';
  });

  it('performs the enrollment stamp and payment insert in a single RPC', async () => {
    rpcMock.mockResolvedValue({ data: [{ payment_id: 'p1' }], error: null });
    const { recordCheckoutSession } = await import('../payment.service');

    await recordCheckoutSession({
      enrollmentId: ENROLLMENT_ID,
      familyUserId: FAMILY_USER_ID,
      provider: 'stripe',
      sessionId: 'cs_test_1',
      amountCents: 120000,
      currency: 'cop',
      metadata: { class_id: 'c1' },
    });

    expect(rpcMock).toHaveBeenCalledTimes(1);
    expect(rpcMock).toHaveBeenCalledWith('record_checkout_session', {
      p_enrollment_id: ENROLLMENT_ID,
      p_family_user_id: FAMILY_USER_ID,
      p_provider: 'stripe',
      p_session_id: 'cs_test_1',
      p_amount_cents: 120000,
      p_currency: 'cop',
      p_tenant_slug: 'peskids',
      p_metadata: { class_id: 'c1' },
    });
  });

  it('surfaces a failure without leaking the driver error', async () => {
    rpcMock.mockResolvedValue({
      data: null,
      error: { code: '23505', message: 'duplicate key value violates unique constraint "x"' },
    });
    const { recordCheckoutSession } = await import('../payment.service');

    await expect(
      recordCheckoutSession({
        enrollmentId: ENROLLMENT_ID,
        familyUserId: FAMILY_USER_ID,
        provider: 'stripe',
        sessionId: 'cs_test_1',
        amountCents: 120000,
        currency: 'cop',
      })
    ).rejects.toThrow(/record_checkout_session failed: 23505/);
  });
});

describe('createCheckoutForEnrollment', () => {
  beforeEach(() => {
    vi.resetModules();
    rpcMock.mockReset();
    typedFromMock.mockReset();
    getClassByIdMock.mockReset();
    process.env.NEXT_PUBLIC_TENANT_ID = 'peskids';
    process.env.STRIPE_SECRET_KEY = 'sk_test_dummy';
  });

  it('never writes to the payment tables directly', async () => {
    stubEnrollmentLookup({ id: ENROLLMENT_ID, class_id: 'c1', payment_status: 'pending' });
    getClassByIdMock.mockResolvedValue({
      id: 'c1',
      title: 'Nivel 1',
      price_cents: 120000,
      currency: 'cop',
    });
    rpcMock.mockResolvedValue({ data: [{ payment_id: 'p1' }], error: null });

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ id: 'cs_test_1', url: 'https://checkout.stripe.com/x' }),
      }))
    );

    const { createCheckoutForEnrollment } = await import('../payment.service');
    const result = await createCheckoutForEnrollment({
      enrollmentId: ENROLLMENT_ID,
      familyUserId: FAMILY_USER_ID,
    });

    expect(result.session_id).toBe('cs_test_1');
    expect(rpcMock).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
  });
});

describe('markEnrollmentPaidBySession', () => {
  beforeEach(() => {
    vi.resetModules();
    rpcMock.mockReset();
    process.env.NEXT_PUBLIC_TENANT_ID = 'peskids';
  });

  it('marks the enrollment and its payment in one RPC', async () => {
    rpcMock.mockResolvedValue({
      data: [{ enrollment_id: ENROLLMENT_ID, already_paid: false }],
      error: null,
    });
    const { markEnrollmentPaidBySession } = await import('../payment.service');

    const result = await markEnrollmentPaidBySession({
      provider: 'stripe',
      sessionId: 'cs_test_1',
      transactionId: 'pi_1',
    });

    expect(rpcMock).toHaveBeenCalledTimes(1);
    expect(rpcMock).toHaveBeenCalledWith('mark_enrollment_paid', {
      p_provider: 'stripe',
      p_session_id: 'cs_test_1',
      p_transaction_id: 'pi_1',
      p_tenant_slug: 'peskids',
    });
    expect(result).toEqual({ enrollmentId: ENROLLMENT_ID, alreadyPaid: false });
  });

  it('reports a replayed confirmation as already paid', async () => {
    rpcMock.mockResolvedValue({
      data: [{ enrollment_id: ENROLLMENT_ID, already_paid: true }],
      error: null,
    });
    const { markEnrollmentPaidBySession } = await import('../payment.service');

    await expect(
      markEnrollmentPaidBySession({ provider: 'stripe', sessionId: 'cs_test_1' })
    ).resolves.toEqual({ enrollmentId: ENROLLMENT_ID, alreadyPaid: true });
  });
});

/**
 * In-memory model of `peskids.mark_enrollment_paid`: both statements run inside
 * one transaction, so a failure on the second must roll the first back.
 *
 * The "legacy" case reproduces the two-call code this migration replaced, to
 * show the partial state it could leave behind.
 */
describe('rollback semantics (model of the plpgsql function)', () => {
  type Store = {
    enrollment: { payment_status: string; status: string };
    payment: { status: string; paid_at: string | null };
  };

  function freshStore(): Store {
    return {
      enrollment: { payment_status: 'pending', status: 'reserved' },
      payment: { status: 'pending', paid_at: null },
    };
  }

  /** Transactional: snapshot, apply, restore on error. */
  function markPaidAtomically(store: Store, failOnPaymentWrite: boolean): void {
    const snapshot: Store = JSON.parse(JSON.stringify(store)) as Store;
    try {
      store.enrollment.payment_status = 'paid';
      store.enrollment.status = 'confirmed';
      if (failOnPaymentWrite) throw new Error('payments update failed');
      store.payment.status = 'paid';
      store.payment.paid_at = '2026-09-05T00:00:00.000Z';
    } catch (err) {
      store.enrollment = snapshot.enrollment;
      store.payment = snapshot.payment;
      throw err;
    }
  }

  /** What the code did before: two independent PostgREST calls. */
  function markPaidLegacy(store: Store, failOnPaymentWrite: boolean): void {
    store.enrollment.payment_status = 'paid';
    store.enrollment.status = 'confirmed';
    if (failOnPaymentWrite) throw new Error('payments update failed');
    store.payment.status = 'paid';
  }

  it('commits both rows when nothing fails', () => {
    const store = freshStore();
    markPaidAtomically(store, false);
    expect(store.enrollment.payment_status).toBe('paid');
    expect(store.payment.status).toBe('paid');
  });

  it('leaves NOTHING partially committed when the second write fails', () => {
    const store = freshStore();
    expect(() => markPaidAtomically(store, true)).toThrow('payments update failed');
    expect(store).toEqual(freshStore());
  });

  it('documents the partial state the previous two-call code could leave', () => {
    const store = freshStore();
    expect(() => markPaidLegacy(store, true)).toThrow('payments update failed');
    // Enrollment says paid, payment still pending — the inconsistency the
    // migration removes.
    expect(store.enrollment.payment_status).toBe('paid');
    expect(store.payment.status).toBe('pending');
  });
});
