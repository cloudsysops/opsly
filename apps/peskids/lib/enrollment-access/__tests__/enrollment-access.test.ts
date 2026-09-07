import { createHash } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ENROLLMENT_LINK_UNAVAILABLE,
  ENROLLMENT_TOKEN_PURPOSE,
  generateEnrollmentToken,
  hashEnrollmentToken,
  isOpaqueEnrollmentToken,
} from '../token';
import { evaluateEnrollmentAccess } from '../policy';
import { enrollmentUrlContainsPii } from '../url';
import { buildEnrollmentLinkDraft } from '../whatsapp';
import { issueEnrollmentLink } from '../issue';
import { resolveEnrollmentToken } from '../resolve';
import { submitEnrollmentForm } from '../submit';
import { enrollmentStaffViewFromMetadata } from '../staff-state';
import { inventoryPeskidsAutomationFlags, anyCustomerAutoSendEnabled } from '../flag-inventory';
import type { EnrollmentAccessRecord, EnrollmentLeadRecord } from '../types';
import type { EnrollmentLeadStore } from '../store';

const convertLeadToStudentMock = vi.fn();
const emitEventMock = vi.fn();

vi.mock('@/lib/services/lead-conversion.service', () => ({
  convertLeadToStudent: (...args: unknown[]) => convertLeadToStudentMock(...args),
  LeadConvertDuplicateError: class LeadConvertDuplicateError extends Error {
    readonly duplicates: unknown[] = [];
  },
}));

vi.mock('@/lib/events', () => ({
  emitEvent: (...args: unknown[]) => emitEventMock(...args),
}));

vi.mock('@/lib/app-url', () => ({
  PESKIDS_APP_ORIGIN: 'https://peskids-staging.op-sly.com',
}));

function accessFixture(overrides: Partial<EnrollmentAccessRecord> = {}): EnrollmentAccessRecord {
  return {
    token_hash: hashEnrollmentToken('valid-token-aaaaaaaaaaaaaaaaaaaaaaaaaaaa'),
    purpose: ENROLLMENT_TOKEN_PURPOSE,
    tenant_slug: 'peskids',
    created_at: '2026-09-07T12:00:00.000Z',
    expires_at: '2026-09-14T12:00:00.000Z',
    revoked_at: null,
    used_at: null,
    opened_at: null,
    policy: 'single_use_on_submit',
    ...overrides,
  };
}

function memoryStore(initial: EnrollmentLeadRecord[]): EnrollmentLeadStore {
  const rows = new Map(initial.map((row) => [row.id, structuredClone(row)]));
  return {
    async getById(leadId) {
      return rows.get(leadId) ?? null;
    },
    async findByTokenHash(tokenHash) {
      return (
        [...rows.values()].find((row) => row.metadata.enrollment_access?.token_hash === tokenHash) ??
        null
      );
    },
    async saveMetadata(leadId, _tenant, metadata) {
      const current = rows.get(leadId);
      if (!current) throw new Error('missing lead');
      current.metadata = metadata;
    },
  };
}

const validForm = {
  guardian: {
    first_name: 'Ana',
    last_name: 'Perez',
    email: 'ana@example.com',
    phone: '+573001112233',
  },
  student: { first_name: 'Luis', age_range: 'K-5' as const },
  program: { modality: 'llanogrande' as const, unit: 'Llanogrande', interest: 'natacion' },
  operational: { preferred_schedule: 'Martes 4pm' },
  consents: { enrollment_confirmed: true as const, privacy_accepted: true as const },
};

describe('enrollment token security', () => {
  it('issues an opaque URL without PII or entity ids', async () => {
    const store = memoryStore([
      {
        id: 'lead-1',
        tenant_slug: 'peskids',
        status: 'new',
        metadata: {},
        referral_source: 'instagram',
        created_at: '2026-09-01T10:00:00.000Z',
      },
    ]);
    const issued = await issueEnrollmentLink({
      store,
      leadId: 'lead-1',
      leadName: 'Ana Perez',
    });
    expect(issued).not.toBeNull();
    expect(issued?.url).toMatch(/^https:\/\/peskids-staging\.op-sly\.com\/matricula\/[A-Za-z0-9_-]+$/);
    expect(enrollmentUrlContainsPii(issued?.url ?? '')).toBe(false);
    expect(issued?.url).not.toContain('lead-1');
    expect(issued?.whatsapp_draft.template).toBe('ENROLLMENT_LINK');
    expect(issued?.whatsapp_draft.message).toContain(issued?.url ?? '');
    const saved = await store.getById('lead-1', 'peskids');
    expect(saved?.metadata.enrollment_access?.token_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(saved?.metadata)).not.toContain(issued?.url.split('/').pop());
  });

  it('denies invalid, expired, revoked, wrong purpose, wrong tenant and replay', () => {
    const now = new Date('2026-09-08T12:00:00.000Z');
    const hash = hashEnrollmentToken('valid-token-aaaaaaaaaaaaaaaaaaaaaaaaaaaa');
    expect(evaluateEnrollmentAccess(null, hash, now).ok).toBe(false);
    expect(evaluateEnrollmentAccess(accessFixture({ expires_at: '2026-09-01T00:00:00.000Z' }), hash, now)).toEqual({
      ok: false,
      reason: 'expired',
    });
    expect(evaluateEnrollmentAccess(accessFixture({ revoked_at: now.toISOString() }), hash, now)).toEqual({
      ok: false,
      reason: 'revoked',
    });
    expect(
      evaluateEnrollmentAccess(accessFixture({ purpose: 'enrollment' }), 'deadbeef'.repeat(8), now)
    ).toEqual({ ok: false, reason: 'invalid' });
    expect(evaluateEnrollmentAccess(accessFixture({ tenant_slug: 'other' }), hash, now)).toEqual({
      ok: false,
      reason: 'wrong_tenant',
    });
    expect(
      evaluateEnrollmentAccess(accessFixture({ used_at: now.toISOString() }), hash, now, 'submit')
    ).toEqual({ ok: false, reason: 'replay' });
  });

  it('does not leak whether a lead exists for unknown tokens', async () => {
    const store = memoryStore([]);
    const resolved = await resolveEnrollmentToken({
      store,
      rawToken: generateEnrollmentToken(),
      mode: 'open',
    });
    expect(resolved).toEqual({
      ok: false,
      error: ENROLLMENT_LINK_UNAVAILABLE,
      reason: 'invalid',
    });
  });

  it('rejects non-opaque tokens', () => {
    expect(isOpaqueEnrollmentToken('lead_id=abc')).toBe(false);
    expect(isOpaqueEnrollmentToken(generateEnrollmentToken())).toBe(true);
  });
});

describe('enrollment form + submit', () => {
  beforeEach(() => {
    convertLeadToStudentMock.mockReset();
    emitEventMock.mockReset();
    emitEventMock.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('rejects lead_id and unknown fields', async () => {
    const store = memoryStore([]);
    const result = await submitEnrollmentForm({
      store,
      rawToken: generateEnrollmentToken(),
      body: { ...validForm, lead_id: 'lead-1' },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(400);
    }
  });

  it('links family + student + enrollment once and is idempotent on retry', async () => {
    const raw = generateEnrollmentToken();
    const store = memoryStore([
      {
        id: 'lead-1',
        tenant_slug: 'peskids',
        status: 'new',
        metadata: {
          enrollment_access: accessFixture({ token_hash: hashEnrollmentToken(raw) }),
          campaign: 'ig-sept',
        },
        referral_source: 'instagram',
        created_at: '2026-09-01T10:00:00.000Z',
      },
    ]);
    convertLeadToStudentMock.mockResolvedValue({
      created: true,
      student: { id: 'stu-1' },
      lead: { id: 'lead-1', status: 'enrolled', referral_source: 'instagram' },
    });

    const first = await submitEnrollmentForm({ store, rawToken: raw, body: validForm });
    expect(first.ok).toBe(true);
    if (first.ok) {
      expect(first.student_id).toBe('stu-1');
      expect(first.family_link).toBe('created');
      expect(first.next_action).toBe('PREPARE_FIRST_CLASS');
      expect(first.family_ref).toBe(
        `fam_${createHash('sha256').update('ana@example.com', 'utf8').digest('hex').slice(0, 16)}`
      );
    }
    expect(convertLeadToStudentMock).toHaveBeenCalledTimes(1);
    expect(emitEventMock).toHaveBeenCalledWith(
      'enrollment.form.submitted',
      expect.objectContaining({ lead_id: 'lead-1', student_id: 'stu-1' })
    );

    convertLeadToStudentMock.mockClear();
    const retry = await submitEnrollmentForm({ store, rawToken: raw, body: validForm });
    expect(retry.ok).toBe(true);
    if (retry.ok) {
      expect(retry.already_submitted).toBe(true);
      expect(retry.student_id).toBe('stu-1');
    }
    expect(convertLeadToStudentMock).not.toHaveBeenCalled();

    const saved = await store.getById('lead-1', 'peskids');
    expect(saved?.created_at).toBe('2026-09-01T10:00:00.000Z');
    expect(saved?.referral_source).toBe('instagram');
    expect(saved?.metadata.enrollment_outcome?.campaign).toBe('ig-sept');
    expect(saved?.metadata.first_class?.status).toBe('pending');
    expect(enrollmentStaffViewFromMetadata(saved?.metadata ?? {}).next_action).toBe(
      'PREPARE_FIRST_CLASS'
    );
  });

  it('keeps a generic error when the token is unknown', async () => {
    const result = await submitEnrollmentForm({
      store: memoryStore([]),
      rawToken: generateEnrollmentToken(),
      body: validForm,
    });
    expect(result).toEqual({
      ok: false,
      error: ENROLLMENT_LINK_UNAVAILABLE,
      status: 404,
    });
  });
});

describe('whatsapp enrollment draft', () => {
  it('does not invent price, discount or availability', () => {
    const draft = buildEnrollmentLinkDraft({
      leadName: 'Ana Perez',
      enrollmentUrl: 'https://peskids-staging.op-sly.com/matricula/abc',
    });
    expect(draft.message).not.toMatch(/precio|descuento|promoci[oó]n|cupo/i);
  });
});

describe('flag inventory', () => {
  it('defaults every automation flag off and never enables customer auto-send', () => {
    const rows = inventoryPeskidsAutomationFlags({});
    expect(rows.every((row) => row.enabled === false)).toBe(true);
    expect(anyCustomerAutoSendEnabled({})).toBe(false);
    expect(anyCustomerAutoSendEnabled({ PESKIDS_HOT_LEAD_ALERTS_ENABLED: 'true' })).toBe(false);
    expect(anyCustomerAutoSendEnabled({ PESKIDS_WHATSAPP_AUTO_SEND_ENABLED: 'true' })).toBe(true);
  });
});
