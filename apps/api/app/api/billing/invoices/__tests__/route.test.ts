import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET, POST } from '../route';

const {
  mockResolveTrustedPortalSession,
  mockRequireAdminAccess,
  mockCreateInvoice,
  mockListInvoices,
  mockGetServiceClient,
} = vi.hoisted(() => {
  const mockResolveTrustedPortalSession = vi.fn();
  const mockRequireAdminAccess = vi.fn();
  const mockCreateInvoice = vi.fn();
  const mockListInvoices = vi.fn();
  const mockGetServiceClient = vi.fn();

  return {
    mockResolveTrustedPortalSession,
    mockRequireAdminAccess,
    mockCreateInvoice,
    mockListInvoices,
    mockGetServiceClient,
  };
});

vi.mock('../../../../../lib/portal-trusted-identity', () => ({
  resolveTrustedPortalSession: mockResolveTrustedPortalSession,
}));

vi.mock('../../../../../lib/auth', () => ({
  requireAdminAccess: mockRequireAdminAccess,
}));

vi.mock('../../../../../lib/billing/invoice-service', () => ({
  createInvoice: mockCreateInvoice,
  listInvoices: mockListInvoices,
}));

vi.mock('../../../../../lib/supabase', () => ({
  getServiceClient: mockGetServiceClient,
}));

vi.mock('../../../../../lib/validation', () => ({
  formatZodError: (err: { issues: { message: string }[] }) =>
    err.issues.map((i) => i.message).join(', '),
}));

function jsonRequest(url: string, body?: unknown): Request {
  const init: RequestInit = { method: body ? 'POST' : 'GET' };
  if (body) {
    init.headers = { 'Content-Type': 'application/json' };
    init.body = JSON.stringify(body);
  }
  return new Request(url, init);
}

const fakeTenant = {
  id: 'tid-123',
  slug: 'smiletripcare',
  name: 'SmileTripCare',
  owner_email: 'owner@test.com',
  plan: 'startup',
  status: 'active',
  services: {},
  created_at: '2026-01-01T00:00:00Z',
};

const fakeSession = {
  ok: true as const,
  session: {
    user: { id: 'u1', email: 'owner@test.com' },
    tenant: fakeTenant,
  },
};

describe('GET /api/billing/invoices', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns invoices for portal session', async () => {
    mockResolveTrustedPortalSession.mockResolvedValue(fakeSession);
    mockListInvoices.mockResolvedValue({
      data: [{ id: 'inv-1', invoice_number: 'INV-smiletripcare-0001' }],
      total: 1,
    });

    const req = jsonRequest('http://localhost/api/billing/invoices');
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].invoice_number).toBe('INV-smiletripcare-0001');
    expect(mockListInvoices).toHaveBeenCalledWith('tid-123', 1, 20, undefined);
  });

  it('returns invoices for admin with tenant_id filter', async () => {
    mockRequireAdminAccess.mockResolvedValue(null);
    mockListInvoices.mockResolvedValue({ data: [], total: 0 });

    const req = jsonRequest('http://localhost/api/billing/invoices?tenant_id=tid-456&limit=10');
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.total).toBe(0);
    expect(mockListInvoices).toHaveBeenCalledWith('tid-456', 1, 10, undefined);
  });

  it('returns 401 when unauthorized', async () => {
    mockResolveTrustedPortalSession.mockResolvedValue({
      ok: false,
      response: Response.json({ error: 'Unauthorized' }, { status: 401 }),
    });

    const req = jsonRequest('http://localhost/api/billing/invoices');
    const res = await GET(req);

    expect(res.status).toBe(401);
  });
});

describe('POST /api/billing/invoices', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates invoice via portal session', async () => {
    mockResolveTrustedPortalSession.mockResolvedValue(fakeSession);
    mockCreateInvoice.mockResolvedValue({
      id: 'inv-new',
      invoice_number: 'INV-smiletripcare-0001',
      status: 'draft',
      total_cents: 150000000,
      line_items: [
        {
          id: 'li-1',
          description: 'n8n automation',
          quantity: 1,
          unit_price_cents: 150000000,
          total_cents: 150000000,
        },
      ],
    });

    const req = jsonRequest('http://localhost/api/billing/invoices', {
      customer_email: 'client@techcorp.com',
      customer_name: 'TechCorp',
      line_items: [{ description: 'n8n automation', quantity: 1, unit_price_cents: 150000000 }],
      currency: 'COP',
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.invoice_number).toBe('INV-smiletripcare-0001');
    expect(mockCreateInvoice).toHaveBeenCalledWith(
      'tid-123',
      'smiletripcare',
      expect.objectContaining({ customer_email: 'client@techcorp.com' })
    );
  });

  it('returns 400 for missing line_items', async () => {
    mockResolveTrustedPortalSession.mockResolvedValue(fakeSession);

    const req = jsonRequest('http://localhost/api/billing/invoices', {
      customer_email: 'client@techcorp.com',
      line_items: [],
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid email', async () => {
    mockResolveTrustedPortalSession.mockResolvedValue(fakeSession);

    const req = jsonRequest('http://localhost/api/billing/invoices', {
      customer_email: 'not-an-email',
      line_items: [{ description: 'x', quantity: 1, unit_price_cents: 100 }],
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('creates invoice via admin with tenant_id', async () => {
    mockRequireAdminAccess.mockResolvedValue(null);
    mockGetServiceClient.mockReturnValue({
      schema: () => ({
        from: () => ({
          select: () => ({
            eq: () => ({
              maybeSingle: () =>
                Promise.resolve({
                  data: { slug: 'test-tenant' },
                  error: null,
                }),
            }),
          }),
        }),
      }),
    });
    mockCreateInvoice.mockResolvedValue({
      id: 'inv-admin',
      invoice_number: 'INV-test-tenant-0001',
      status: 'draft',
      total_cents: 50000,
      line_items: [],
    });

    const req = jsonRequest('http://localhost/api/billing/invoices', {
      tenant_id: 'tid-admin',
      customer_email: 'admin@test.com',
      line_items: [{ description: 'Service', quantity: 1, unit_price_cents: 50000 }],
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.invoice_number).toBe('INV-test-tenant-0001');
  });
});
