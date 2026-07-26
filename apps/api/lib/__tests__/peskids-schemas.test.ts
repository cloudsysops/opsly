import { describe, expect, it } from 'vitest';
import { peskidsFeedbackBodySchema, peskidsLeadBodySchema } from '../peskids/schemas';

describe('peskidsLeadBodySchema', () => {
  it('accepts valid lead payload', () => {
    const parsed = peskidsLeadBodySchema.safeParse({
      name: 'Maria Lopez',
      email: 'maria@example.com',
      phone: '555-1234',
      class_modality: 'llanogrande',
      neighborhood: 'Llanogrande',
      grade_interested: 'K-5',
      referral_source: 'Referral',
    });
    expect(parsed.success).toBe(true);

    const parsedWebsite = peskidsLeadBodySchema.safeParse({
      name: 'Maria Lopez',
      email: 'maria@example.com',
      phone: '555-1234',
      class_modality: 'llanogrande',
      neighborhood: 'Llanogrande',
      grade_interested: 'K-5',
      referral_source: 'Website',
    });
    expect(parsedWebsite.success).toBe(true);
  });

  it('rejects invalid grade', () => {
    const parsed = peskidsLeadBodySchema.safeParse({
      name: 'Maria Lopez',
      email: 'maria@example.com',
      class_modality: 'domicilio',
      neighborhood: 'El Poblado',
      grade_interested: 'invalid',
    });
    expect(parsed.success).toBe(false);
  });

  it('accepts company leads with NIT and institutional service mode', () => {
    const parsed = peskidsLeadBodySchema.safeParse({
      name: 'Laura Perez',
      email: 'laura@example.com',
      class_modality: 'llanogrande',
      neighborhood: 'Llanogrande',
      grade_interested: 'Other',
      lead_type: 'company',
      service_mode: 'institutional',
      company_name: 'Colegio Llanogrande',
      company_nit: '900123456-7',
    });
    expect(parsed.success).toBe(true);
  });

  it('requires NIT for company leads', () => {
    const parsed = peskidsLeadBodySchema.safeParse({
      name: 'Laura Perez',
      email: 'laura@example.com',
      class_modality: 'llanogrande',
      neighborhood: 'Llanogrande',
      grade_interested: 'Other',
      lead_type: 'company',
      service_mode: 'institutional',
      company_name: 'Colegio Llanogrande',
    });
    expect(parsed.success).toBe(false);
  });
});

describe('peskidsFeedbackBodySchema', () => {
  it('accepts valid feedback payload', () => {
    const parsed = peskidsFeedbackBodySchema.safeParse({
      child_name: 'Juan',
      satisfaction: 4,
      suggestion: 'Great program',
      contact_me_back: true,
    });
    expect(parsed.success).toBe(true);
  });

  it('rejects satisfaction out of range', () => {
    const parsed = peskidsFeedbackBodySchema.safeParse({
      child_name: 'Juan',
      satisfaction: 6,
    });
    expect(parsed.success).toBe(false);
  });
});
