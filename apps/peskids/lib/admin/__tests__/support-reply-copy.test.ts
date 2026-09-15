import { describe, expect, it } from 'vitest';
import { buildFamilySupportTemplates } from '@/lib/admin/support-reply-copy';

describe('support reply copy', () => {
  it('offers enrollment-link copy and never mentions trial class', () => {
    const templates = buildFamilySupportTemplates('Ana', 'new');
    const joined = templates.map((item) => `${item.id} ${item.label} ${item.message}`).join('\n');
    expect(templates.some((item) => item.id === 'enrollment_link')).toBe(true);
    expect(joined).not.toMatch(/clase de prueba|trial/i);
  });
});
