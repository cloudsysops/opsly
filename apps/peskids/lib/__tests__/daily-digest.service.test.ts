import { describe, expect, it, vi } from 'vitest';

const { fetchPlatformLeadsForDashboardMock } = vi.hoisted(() => ({
  fetchPlatformLeadsForDashboardMock: vi.fn(),
}));

vi.mock('@/lib/peskids-platform-dashboard', () => ({
  fetchPlatformLeadsForDashboard: fetchPlatformLeadsForDashboardMock,
}));

vi.mock('@/lib/peskids-platform-read', () => ({
  isMissingPlatformPeskidsTable: vi.fn(() => false),
}));

vi.mock('@/lib/supabase', () => ({
  supabaseServer: vi.fn(() => ({
    from: vi.fn((table: string) => {
      if (table === 'followups') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn().mockResolvedValue({
                data: [
                  {
                    id: 'fu-1',
                    contact_type: 'lead',
                    type: 'call',
                    due_date: '2026-06-09',
                    status: 'pending',
                  },
                ],
                error: null,
              }),
            })),
          })),
        };
      }
      if (table === 'messages') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn((column: string) => {
              if (column === 'tenant_id') {
                return {
                  eq: vi.fn(() => ({
                    or: vi.fn(() => ({
                      order: vi.fn(() => ({
                        limit: vi.fn().mockResolvedValue({
                          data: [
                            {
                              id: 'msg-1',
                              sender_name: 'María',
                              sender_contact: '300111',
                              source: 'whatsapp',
                              message_text: 'Hola',
                              created_at: '2026-06-09T09:00:00.000Z',
                              status: 'pending_approval',
                              external_id: 'wacrm:ext-1',
                              direction: 'inbound',
                            },
                          ],
                          error: null,
                        }),
                      })),
                    })),
                  })),
                  like: vi.fn(() => ({
                    order: vi.fn(() => ({
                      limit: vi.fn().mockResolvedValue({
                        data: [
                          {
                            sender_contact: '300111',
                            message_text: 'Hola',
                            created_at: '2026-06-09T09:00:00.000Z',
                            status: 'pending_approval',
                            direction: 'inbound',
                            external_id: 'wacrm:ext-1',
                          },
                        ],
                        error: null,
                      }),
                    })),
                  })),
                };
              }
              return {
                eq: vi.fn(),
              };
            }),
          })),
        };
      }
      if (table === 'trial_classes') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                neq: vi.fn(() => ({
                  order: vi.fn().mockResolvedValue({ data: [], error: null }),
                })),
              })),
            })),
          })),
        };
      }
      if (table === 'leads') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => ({
                limit: vi.fn().mockResolvedValue({ data: [], error: null }),
              })),
            })),
          })),
        };
      }
      throw new Error(`Unexpected table ${table}`);
    }),
  })),
}));

import { buildDailyDigest, emptyDailyDigest } from '@/lib/services/daily-digest.service';

describe('buildDailyDigest', () => {
  it('returns expected summary sections', async () => {
    fetchPlatformLeadsForDashboardMock.mockResolvedValue({
      ok: true,
      rows: [
        {
          id: 'lead-1',
          full_name: 'Ana',
          status: 'new',
          created_at: '2026-06-09T10:00:00.000Z',
        },
      ],
    });

    const digest = await buildDailyDigest(new Date('2026-06-09T12:00:00.000Z'));

    expect(digest.tenant_slug).toBe('peskids');
    expect(digest.leads.new_today).toBeGreaterThanOrEqual(1);
    expect(digest.followups.due_today).toBeGreaterThanOrEqual(1);
    expect(digest.messages.pending_approval).toBeGreaterThanOrEqual(1);
    expect(digest.wacrm.pending_reply).toBeGreaterThanOrEqual(1);
    expect(digest.highlight_lines.some((line) => line.includes('wacrm'))).toBe(true);
    expect(digest.highlight_lines.length).toBeGreaterThan(0);
    expect(digest.highlight_lines[0]).toMatch(/Resumen diario Peskids/);
  });
});

describe('emptyDailyDigest', () => {
  it('returns zero counts with highlight lines', () => {
    const digest = emptyDailyDigest(new Date('2026-06-09T12:00:00.000Z'));

    expect(digest.leads.new_today).toBe(0);
    expect(digest.messages.pending_approval).toBe(0);
    expect(digest.highlight_lines).toContain('Mensajes pendientes de aprobación: 0');
  });
});
