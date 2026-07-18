import { beforeEach, describe, expect, it, vi } from 'vitest';

const validateStaffRequestMock = vi.fn();

let lastFormsInsertPayload: Record<string, unknown> | undefined;
let lastFieldsInsertPayload: unknown[] | undefined;

const formsInsertMock = vi.fn((payload: Record<string, unknown>) => {
  lastFormsInsertPayload = payload;
  return {
    select: () => ({
      single: async () => ({
        data: { id: 'form-row-1', created_at: '2026-07-17T00:00:00Z' },
        error: null,
      }),
    }),
  };
});

const fieldsInsertMock = vi.fn(async (payload: unknown[]) => {
  lastFieldsInsertPayload = payload;
  return { error: null };
});

const rpcMock = vi.fn(async () => ({ error: null }));

const fromMock = vi.fn((table: string) => {
  if (table === 'forms') return { insert: formsInsertMock };
  if (table === 'form_fields') return { insert: fieldsInsertMock };
  throw new Error(`Unexpected table: ${table}`);
});

const schemaMock = vi.fn(() => ({ from: fromMock, rpc: rpcMock }));
const supabaseServerMock = vi.fn(() => ({ schema: schemaMock, rpc: rpcMock }));

vi.mock('@/lib/staff-auth', () => ({
  validateStaffRequest: validateStaffRequestMock,
}));

vi.mock('@/lib/supabase', () => ({
  supabaseServer: supabaseServerMock,
}));

function buildRequest(body: Record<string, unknown>) {
  return {
    headers: new Headers({ 'x-request-id': 'forms-test' }),
    json: async () => body,
  } as never;
}

describe('POST /api/forms', () => {
  beforeEach(() => {
    validateStaffRequestMock.mockReset();
    supabaseServerMock.mockClear();
    schemaMock.mockClear();
    fromMock.mockClear();
    formsInsertMock.mockClear();
    fieldsInsertMock.mockClear();
    rpcMock.mockClear();
    lastFormsInsertPayload = undefined;
    lastFieldsInsertPayload = undefined;
    validateStaffRequestMock.mockResolvedValue({ ok: true, user: { id: 'staff-1' } });
  });

  it('rejects unauthenticated requests', async () => {
    validateStaffRequestMock.mockResolvedValue({ ok: false, status: 401, error: 'Unauthorized' });
    const { POST } = await import('../route');

    const response = await POST(buildRequest({ title: 'Inscripción' }));

    expect(response.status).toBe(401);
    expect(formsInsertMock).not.toHaveBeenCalled();
  });

  it('queries the peskids schema, not public', async () => {
    const { POST } = await import('../route');

    await POST(buildRequest({ title: 'Inscripción' }));

    expect(schemaMock).toHaveBeenCalledWith('peskids');
  });

  it('defaults new forms to active status, not draft', async () => {
    const { POST } = await import('../route');

    await POST(buildRequest({ title: 'Inscripción' }));

    expect(lastFormsInsertPayload?.status).toBe('active');
  });

  it('writes form fields using order_index, matching the peskids.form_fields schema', async () => {
    const { POST } = await import('../route');

    await POST(
      buildRequest({
        title: 'Inscripción',
        fields: [{ type: 'text', label: 'Nombre' }],
      })
    );

    expect(lastFieldsInsertPayload).toBeDefined();
    const field = (lastFieldsInsertPayload as Record<string, unknown>[])[0];
    expect(field.order_index).toBe(0);
    expect(field.order).toBeUndefined();
  });
});
