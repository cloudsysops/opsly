import { describe, expect, it } from 'vitest';
import type { EnrichedContext } from '../src/context-enricher.js';
import { buildPrompt } from '../src/prompt-builder.js';
import type { DetectedIntent } from '../src/types.js';

function baseCtx(over: Partial<EnrichedContext> = {}): EnrichedContext {
  return {
    repo: { paths: ['apps/api/lib/x.ts'] },
    sessions: [],
    feedback: [
      {
        reasoning: 'Similar issue fixed by adding null guard',
        implementation_prompt: 'Patch route handler',
      },
    ],
    tenant: {
      slug: 'acme',
      plan: 'business',
      owner_email: 'o@acme.test',
      services: { n8n: true },
    },
    rag: [{ id: '1', content: 'Doc chunk about Traefik', similarity: 0.81 }],
    errors: [],
    ...over,
  };
}

describe('prompt-builder', () => {
  it('incluye secciones Contexto, Tarea, Constraints, Formato y Ejemplos', () => {
    const intent: DetectedIntent = {
      intent: 'bug_fix',
      confidence: 0.9,
      affected_area: 'frontend',
      urgency: 'high',
      suggested_team: 'frontend-team',
    };
    const out = buildPrompt('Arreglar el botón que no hace submit', intent, baseCtx());
    expect(out).toMatch(/^## Contexto técnico/m);
    expect(out).toContain('## Tarea específica');
    expect(out).toContain('Arreglar el botón');
    expect(out).toContain('## Constraints');
    expect(out).toMatch(/no usar any/i);
    expect(out).toContain('## Formato esperado');
    expect(out).toContain('## Ejemplos relevantes');
    expect(out).toContain('Similar issue fixed');
    expect(out).toContain('apps/api/lib/x.ts');
    expect(out).toContain('acme');
  });

  it('ajusta formato esperado por intent deploy', () => {
    const intent: DetectedIntent = {
      intent: 'deploy',
      confidence: 0.8,
      affected_area: 'infra',
      urgency: 'medium',
      suggested_team: 'infra-team',
    };
    const out = buildPrompt('Subir versión a staging', intent, baseCtx());
    expect(out).toContain('bash idempotentes');
    expect(out).toContain('rollback');
  });

  it('sin tenant ni rag sigue siendo estructurado', () => {
    const intent: DetectedIntent = {
      intent: 'question',
      confidence: 0.7,
      affected_area: 'backend',
      urgency: 'low',
      suggested_team: 'backend-team',
    };
    const ctx = baseCtx({
      tenant: null,
      rag: [],
      feedback: [],
      repo: { paths: [] },
      errors: ['repo:timeout'],
    });
    const out = buildPrompt('¿Cómo funciona el gateway?', intent, ctx);
    expect(out).toContain('sin fila en Supabase');
    expect(out).toContain('repo:timeout');
    expect(out).toContain('Sin feedback similar');
  });
});
