import { describe, expect, it } from 'vitest';
import {
  gohighlevelLeadIntakeSchema,
  leadApiPostSchema,
  leadCaptureFormSchema,
  toCreateLeadInput,
} from '@/lib/validation/lead.schema';

describe('leadCaptureFormSchema', () => {
  const validForm = {
    name: 'María García',
    email: 'maria@peskids.co',
    phone: '+57 300 123 4567',
    class_modality: 'llanogrande' as const,
    neighborhood: 'Llanogrande',
    grade_interested: 'K-5' as const,
    referral_source: 'Google' as const,
    referred_by_code: 'PK-ABC123',
  };

  it('accepts a complete Sprint 01 lead form', () => {
    const parsed = leadCaptureFormSchema.parse(validForm);
    expect(parsed.name).toBe('María García');
    expect(parsed.grade_interested).toBe('K-5');
    expect(parsed.referred_by_code).toBe('PK-ABC123');
  });

  it('rejects names shorter than 2 characters', () => {
    const result = leadCaptureFormSchema.safeParse({ ...validForm, name: 'A' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid email', () => {
    const result = leadCaptureFormSchema.safeParse({ ...validForm, email: 'not-an-email' });
    expect(result.success).toBe(false);
  });

  it('allows empty optional phone', () => {
    const parsed = leadCaptureFormSchema.parse({ ...validForm, phone: '' });
    expect(parsed.phone).toBeUndefined();
  });

  it('requires grade_interested enum', () => {
    const result = leadCaptureFormSchema.safeParse({ ...validForm, grade_interested: '3A' });
    expect(result.success).toBe(false);
  });

  it('defaults Llanogrande leads without requiring a manual neighborhood', () => {
    const parsed = leadCaptureFormSchema.parse({
      ...validForm,
      neighborhood: '',
      class_modality: 'llanogrande',
    });
    expect(parsed.lead_type).toBe('family');
    expect(parsed.service_mode).toBe('llanogrande');
    expect(parsed.neighborhood).toBe('Llanogrande');
  });

  it('requires neighborhood for domicilio family leads', () => {
    const result = leadCaptureFormSchema.safeParse({
      ...validForm,
      class_modality: 'domicilio',
      neighborhood: '',
    });
    expect(result.success).toBe(false);
  });

  it('accepts company leads with NIT as institutional service mode', () => {
    const parsed = leadCaptureFormSchema.parse({
      name: 'Laura Perez',
      email: 'laura@colegio.co',
      phone: '+57 300 123 4567',
      lead_type: 'company',
      class_modality: 'llanogrande',
      company_name: 'Colegio Llanogrande',
      company_nit: '900123456-7',
      consent_treatment: true,
    });
    expect(parsed.lead_type).toBe('company');
    expect(parsed.service_mode).toBe('institutional');
    expect(parsed.company_nit).toBe('900123456-7');
  });
});

describe('leadApiPostSchema', () => {
  it('requires consent_treatment true', () => {
    const result = leadApiPostSchema.safeParse({
      name: 'Ana López',
      email: 'ana@peskids.co',
      class_modality: 'domicilio',
      neighborhood: 'Envigado',
      grade_interested: '6-8',
      consent_treatment: false,
    });
    expect(result.success).toBe(false);
  });

  it('accepts payload with consent', () => {
    const parsed = leadApiPostSchema.parse({
      name: 'Ana López',
      email: 'ana@peskids.co',
      class_modality: 'domicilio',
      neighborhood: 'Envigado',
      grade_interested: '6-8',
      consent_treatment: true,
      consent_marketing: false,
    });
    expect(parsed.consent_treatment).toBe(true);
  });
});

describe('toCreateLeadInput', () => {
  it('maps form name to full_name for services', () => {
    const input = toCreateLeadInput({
      name: 'Carlos Ruiz',
      email: 'carlos@peskids.co',
      class_modality: 'llanogrande',
      neighborhood: 'Rionegro',
      grade_interested: '9-12',
    });
    expect(input.full_name).toBe('Carlos Ruiz');
    expect(input.source).toBe('web');
  });
});

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
