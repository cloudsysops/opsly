import { describe, expect, it } from 'vitest';
import {
  improvementClientStatusSchema,
  updateImprovementRequestSchema,
} from '@/lib/validation/improvement-chat.schema';

describe('improvement chat tracking schema', () => {
  it('accepts the client-visible status flow', () => {
    expect(improvementClientStatusSchema.options).toEqual([
      'recibido',
      'priorizado',
      'en_desarrollo',
      'listo_para_probar',
      'aprobado',
      'publicado',
      'backlog',
      'cerrado',
    ]);
  });

  it('validates tracker updates with status and preview URL', () => {
    const parsed = updateImprovementRequestSchema.safeParse({
      id: '11111111-1111-4111-8111-111111111111',
      client_status: 'listo_para_probar',
      preview_url: 'https://preview.peskids.com/mejoras/123',
    });

    expect(parsed.success).toBe(true);
  });

  it('allows explicit GitHub issue creation as an update action', () => {
    const parsed = updateImprovementRequestSchema.safeParse({
      id: '11111111-1111-4111-8111-111111111111',
      create_github_issue: true,
    });

    expect(parsed.success).toBe(true);
  });

  it('rejects empty updates and invalid URLs', () => {
    expect(
      updateImprovementRequestSchema.safeParse({
        id: '11111111-1111-4111-8111-111111111111',
      }).success
    ).toBe(false);

    expect(
      updateImprovementRequestSchema.safeParse({
        id: '11111111-1111-4111-8111-111111111111',
        preview_url: 'not-a-url',
      }).success
    ).toBe(false);
  });
});
