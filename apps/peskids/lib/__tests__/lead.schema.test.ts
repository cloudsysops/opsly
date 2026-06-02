import { describe, expect, it } from 'vitest';
import { gohighlevelLeadIntakeSchema } from '@/lib/validation/lead.schema';

describe('gohighlevelLeadIntakeSchema', () => {
  it('validates the minimal parent/child intake fields', () => {
    const parsed = gohighlevelLeadIntakeSchema.parse({
      parent_name: 'Maria Rodriguez',
      phone: '+573001112233',
      email: 'maria@example.com',
      child_name: 'Mateo',
      age: '8',
      interest: 'Trial class',
    });

    expect(parsed.age).toBe(8);
    expect(parsed.child_name).toBe('Mateo');
  });
});
