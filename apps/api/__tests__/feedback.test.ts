import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as feedbackGet, POST as feedbackPost } from '../app/api/feedback/route';
import { POST as approvePost } from '../app/api/feedback/approve/route';
import * as supabaseMod from '../lib/supabase';

vi.mock('../lib/supabase', () => ({
  getServiceClient: vi.fn(),
}));

vi.mock('@intcloudsysops/llm-gateway', () => ({
  llmCall: vi.fn(),
}));

vi.mock('@intcloudsysops/ml', () => ({
  analyzeFeedback: vi.fn(),
  executeAutoImplement: vi.fn(),
}));

vi.mock('../lib/feedback-notify', () => ({
  notifyDiscordFeedback: vi.fn(),
}));

vi.mock('../lib/portal-feedback-auth', () => ({
  resolveTrustedFeedbackIdentity: vi.fn(),
}));

import { llmCall } from '@intcloudsysops/llm-gateway';
import { resolveTrustedFeedbackIdentity } from '../lib/portal-feedback-auth';
import { analyzeFeedback, executeAutoImplement } from '@intcloudsysops/ml';

function chainableSupabaseForPostML() {
  return {
    schema: () => ({
      from: (table: string) => {
        if (table === 'feedback_conversations') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: {
                    id: 'conv-1',
                    tenant_slug: 'acme',
                    user_email: 'u@acme.com',
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'feedback_messages') {
          return {
            insert: async () => ({ error: null }),
            select: () => ({
              eq: () => ({
                order: async () => ({
                  data: [
                    { role: 'user', content: 'primera' },
                    { role: 'user', content: 'x'.repeat(120) },
                  ],
                  error: null,
                }),
              }),
            }),
          };
        }
        return {};
      },
    }),
  };
}

/** Primera interacción: crea conversación, mensaje corto, rama clarificar + llmCall */
function supabaseMockNewConversationClarify() {
  const convId = 'conv-new-1';
  return {
    schema: () => ({
      from: (table: string) => {
        if (table === 'feedback_conversations') {
          return {
            insert: () => ({
              select: () => ({
                single: async () => ({ data: { id: convId }, error: null }),
              }),
            }),
          };
        }
        if (table === 'feedback_messages') {
          return {
            insert: async () => ({ error: null }),
            select: () => ({
              eq: () => ({
                order: async () => ({
                  data: [{ role: 'user', content: 'Hola, un comentario corto' }],
                  error: null,
                }),
              }),
            }),
          };
        }
        return {};
      },
    }),
  };
}

/** Segundo POST con conversation_id: 2 mensajes usuario → análisis ML */
function supabaseMockSecondMessageAnalysis() {
  return {
    schema: () => ({
      from: (table: string) => {
        if (table === 'feedback_conversations') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: {
                    id: 'conv-existing',
                    tenant_slug: 'acme',
                    user_email: 'u@acme.com',
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'feedback_messages') {
          return {
            insert: async () => ({ error: null }),
            select: () => ({
              eq: () => ({
                order: async () => ({
                  data: [
                    { role: 'user', content: 'uno' },
                    { role: 'user', content: 'dos' },
                  ],
                  error: null,
                }),
              }),
            }),
          };
        }
        return {};
      },
    }),
  };
}

describe('/api/feedback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.PLATFORM_ADMIN_TOKEN = 'admin-secret-token';
    vi.mocked(resolveTrustedFeedbackIdentity).mockResolvedValue({
      ok: true,
      identity: { tenant_slug: 'acme', user_email: 'u@acme.com' },
    });
  });

  it('GET sin token → 401', async () => {
    vi.mocked(supabaseMod.getServiceClient).mockReturnValue({} as never);
    const res = await feedbackGet(new NextRequest(new URL('http://localhost/api/feedback')));
    expect(res.status).toBe(401);
  });

  it('GET con token válido consulta supabase', async () => {
    const final = Promise.resolve({
      data: [{ id: '1', tenant_slug: 't', user_email: 'e', status: 'open' }],
      error: null,
    });
    const builder = {
      select: () => builder,
      eq: () => builder,
      order: () => builder,
      limit: () => final,
    };
    const from = vi.fn().mockReturnValue(builder);
    vi.mocked(supabaseMod.getServiceClient).mockReturnValue({
      schema: () => ({ from }),
    } as never);

    const res = await feedbackGet(
      new NextRequest(new URL('http://localhost/api/feedback'), {
        headers: { 'x-admin-token': 'admin-secret-token' },
      })
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { feedbacks: unknown[] };
    expect(Array.isArray(body.feedbacks)).toBe(true);
  });

  it('POST sin sesión (sin resolver identidad) → 401', async () => {
    vi.mocked(resolveTrustedFeedbackIdentity).mockResolvedValueOnce({
      ok: false,
      response: new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
      }),
    });
    const res = await feedbackPost(
      new Request('http://localhost/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_slug: 'acme',
          user_email: 'u@acme.com',
          message: 'x',
        }),
      })
    );
    expect(res.status).toBe(401);
  });

  it('POST sin message → 400', async () => {
    const res = await feedbackPost(
      new Request('http://localhost/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
    );
    expect(res.status).toBe(400);
  });

  it('POST con tenant_slug que no coincide con sesión → 403', async () => {
    const res = await feedbackPost(
      new Request('http://localhost/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_slug: 'otro-tenant',
          user_email: 'u@acme.com',
          message: 'hola',
        }),
      })
    );
    expect(res.status).toBe(403);
  });

  it('POST con conversation_id de otro tenant → 403', async () => {
    vi.mocked(supabaseMod.getServiceClient).mockReturnValue({
      schema: () => ({
        from: (table: string) => {
          if (table === 'feedback_conversations') {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: async () => ({
                    data: {
                      id: 'conv-other',
                      tenant_slug: 'evil',
                      user_email: 'u@acme.com',
                    },
                    error: null,
                  }),
                }),
              }),
            };
          }
          return {};
        },
      }),
    } as never);

    const res = await feedbackPost(
      new Request('http://localhost/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'hola',
          conversation_id: 'conv-other',
        }),
      })
    );
    expect(res.status).toBe(403);
  });

  it('POST sin conversation_id crea conversación y responde con clarify (llmCall)', async () => {
    vi.mocked(supabaseMod.getServiceClient).mockReturnValue(
      supabaseMockNewConversationClarify() as never
    );
    vi.mocked(llmCall).mockResolvedValue({
      content: '¿Puedes detallar un poco más?',
      model_used: 'haiku',
      tokens_input: 1,
      tokens_output: 1,
      cost_usd: 0,
      cache_hit: false,
      latency_ms: 1,
    });

    const res = await feedbackPost(
      new Request('http://localhost/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_slug: 'acme',
          user_email: 'u@acme.com',
          message: 'Hola, un comentario corto',
        }),
      })
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      conversation_id: string;
      message: string;
      decision_type: null | string;
    };
    expect(body.conversation_id).toBe('conv-new-1');
    expect(body.message).toContain('detallar');
    expect(body.decision_type).toBeNull();
    expect(analyzeFeedback).not.toHaveBeenCalled();
    expect(llmCall).toHaveBeenCalled();
  });

  it('POST con 2+ mensajes de usuario dispara análisis ML (sin mensaje largo)', async () => {
    vi.mocked(supabaseMod.getServiceClient).mockReturnValue(
      supabaseMockSecondMessageAnalysis() as never
    );
    vi.mocked(analyzeFeedback).mockResolvedValue({
      output: {
        decision_type: 'needs_approval',
        criticality: 'medium',
        reasoning: 'test',
        user_response: 'Gracias',
        notify_discord: false,
      },
      decision_id: 'd1',
    });

    const res = await feedbackPost(
      new Request('http://localhost/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_slug: 'acme',
          user_email: 'u@acme.com',
          message: 'dos',
          conversation_id: 'conv-existing',
        }),
      })
    );

    expect(res.status).toBe(200);
    expect(analyzeFeedback).toHaveBeenCalled();
    expect(executeAutoImplement).not.toHaveBeenCalled();
  });

  it('POST con mensaje largo dispara análisis ML', async () => {
    vi.mocked(supabaseMod.getServiceClient).mockReturnValue(chainableSupabaseForPostML() as never);
    vi.mocked(analyzeFeedback).mockResolvedValue({
      output: {
        decision_type: 'needs_approval',
        criticality: 'medium',
        reasoning: 'test',
        user_response: 'Gracias',
        notify_discord: false,
      },
      decision_id: 'd1',
    });

    const res = await feedbackPost(
      new Request('http://localhost/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_slug: 'acme',
          user_email: 'u@acme.com',
          message: 'x'.repeat(120),
          conversation_id: 'conv-1',
        }),
      })
    );

    expect(res.status).toBe(200);
    expect(analyzeFeedback).toHaveBeenCalled();
    expect(executeAutoImplement).not.toHaveBeenCalled();
  });
});

describe('/api/feedback/approve', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.PLATFORM_ADMIN_TOKEN = 'admin-secret-token';
  });

  it('sin token → 401', async () => {
    const res = await approvePost(
      new Request('http://localhost/api/feedback/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision_id: 'x', approved: true }),
      })
    );
    expect(res.status).toBe(401);
  });

  it('con token y approved llama executeAutoImplement', async () => {
    const updateDec = vi.fn().mockReturnValue({ eq: async () => ({ error: null }) });
    const updateConv = vi.fn().mockReturnValue({ eq: async () => ({ error: null }) });
    const from = vi.fn((table: string) => {
      if (table === 'feedback_decisions') {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({
                data: {
                  id: 'dec-1',
                  conversation_id: 'c1',
                  implementation_prompt: 'haz X',
                  feedback_conversations: { tenant_slug: 'acme' },
                },
                error: null,
              }),
            }),
          }),
          update: updateDec,
        };
      }
      if (table === 'feedback_conversations') {
        return { update: updateConv };
      }
      return {};
    });

    vi.mocked(supabaseMod.getServiceClient).mockReturnValue({
      schema: () => ({ from }),
    } as never);

    const res = await approvePost(
      new Request('http://localhost/api/feedback/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': 'admin-secret-token',
        },
        body: JSON.stringify({ decision_id: 'dec-1', approved: true }),
      })
    );

    expect(res.status).toBe(200);
    expect(executeAutoImplement).toHaveBeenCalledWith('dec-1', 'haz X', 'acme');
  });
});
