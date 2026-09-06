import { describe, expect, it } from 'vitest';
import {
  externalLeadIntakeSchema,
  leadApiPostSchema,
  leadCaptureFormSchema,
  toCreateLeadInput,
} from '@/lib/validation/lead.schema';

describe('leadCaptureFormSchema', () => {
  const legacyFamily = {
    name: 'María García',
    email: 'maria@peskids.co',
    phone: '+57 300 123 4567',
    class_modality: 'llanogrande' as const,
    neighborhood: 'Llanogrande',
    grade_interested: 'K-5' as const,
    referral_source: 'Google' as const,
    referred_by_code: 'PK-ABC123',
  };

  it('accepts legacy family payload without lead_type', () => {
    const parsed = leadCaptureFormSchema.parse(legacyFamily);
    expect(parsed.lead_type).toBe('family');
    expect(parsed.grade_interested).toBe('K-5');
    expect(parsed.referred_by_code).toBe('PK-ABC123');
  });

  it('family llanogrande does not require city or neighborhood', () => {
    const parsed = leadCaptureFormSchema.parse({
      lead_type: 'family',
      name: 'Ana López',
      email: 'ana@peskids.co',
      phone: '3001112233',
      child_name: 'Mateo López',
      birth_date: '2018-05-10',
      document_number: '1234567890',
      class_modality: 'llanogrande',
      consent_treatment: true,
    });
    expect(parsed.neighborhood).toBe('Llanogrande');
    expect(parsed.service_mode).toBe('llanogrande');
    expect(parsed.lead_type).toBe('family');
    if (parsed.lead_type === 'family') {
      expect(parsed.city).toBeUndefined();
    }
    expect(parsed.child_name).toBe('Mateo López');
  });

  it('requires the guardian document number for family leads', () => {
    const result = leadCaptureFormSchema.safeParse({
      lead_type: 'family',
      name: 'Ana López',
      email: 'ana@peskids.co',
      phone: '3001112233',
      child_name: 'Mateo López',
      birth_date: '2018-05-10',
      document_number: '',
      class_modality: 'llanogrande',
    });
    expect(result.success).toBe(false);
  });

  it('requires the child birth date for family leads', () => {
    const result = leadCaptureFormSchema.safeParse({
      lead_type: 'family',
      name: 'Ana López',
      email: 'ana@peskids.co',
      phone: '3001112233',
      child_name: 'Mateo López',
      birth_date: '',
      document_number: '1234567890',
      class_modality: 'llanogrande',
    });
    expect(result.success).toBe(false);
  });

  it('family domicilio requires city and neighborhood', () => {
    const missingBoth = leadCaptureFormSchema.safeParse({
      lead_type: 'family',
      name: 'Ana López',
      email: 'ana@peskids.co',
      phone: '3001112233',
      child_name: 'Mateo López',
      birth_date: '2018-05-10',
      document_number: '1234567890',
      class_modality: 'domicilio',
    });
    expect(missingBoth.success).toBe(false);

    const missingCity = leadCaptureFormSchema.safeParse({
      lead_type: 'family',
      name: 'Ana López',
      email: 'ana@peskids.co',
      phone: '3001112233',
      child_name: 'Mateo López',
      birth_date: '2018-05-10',
      document_number: '1234567890',
      class_modality: 'domicilio',
      neighborhood: 'El Poblado',
    });
    expect(missingCity.success).toBe(false);
  });

  it('family domicilio keeps provided city and neighborhood', () => {
    const parsed = leadCaptureFormSchema.parse({
      lead_type: 'family',
      name: 'Ana López',
      email: 'ana@peskids.co',
      phone: '3001112233',
      child_name: 'Sofía',
      birth_date: '2016-01-15',
      document_number: '987654321',
      class_modality: 'domicilio',
      city: 'Medellín',
      neighborhood: 'Envigado',
    });
    expect(parsed.neighborhood).toBe('Envigado');
    expect(parsed.service_mode).toBe('domicilio');
    expect(parsed.lead_type).toBe('family');
    if (parsed.lead_type === 'family') {
      expect(parsed.city).toBe('Medellín');
      expect(parsed.metadata).toMatchObject({ city: 'Medellín' });
    }
  });

  it('family requires phone', () => {
    const result = leadCaptureFormSchema.safeParse({
      lead_type: 'family',
      name: 'Ana López',
      email: 'ana@peskids.co',
      phone: '',
      child_name: 'Mateo López',
      birth_date: '2018-05-10',
      document_number: '1234567890',
      class_modality: 'llanogrande',
    });
    expect(result.success).toBe(false);
  });

  it('teacher applicant saves document number in output', () => {
    const parsed = leadCaptureFormSchema.parse({
      lead_type: 'teacher_applicant',
      name: 'Carlos Ruiz',
      email: 'carlos@peskids.co',
      phone: '3009998877',
      document_number: '1122334455',
      experience: '5 años enseñando natación a niños',
      availability: 'Lunes a viernes tarde',
      work_zones: 'Rionegro y Llanogrande',
    });
    expect(parsed.document_number).toBe('1122334455');
    expect(parsed.metadata).toMatchObject({
      experience: expect.stringContaining('natación'),
      availability: 'Lunes a viernes tarde',
    });
  });

  it('company saves NIT and institutional service_mode', () => {
    const parsed = leadCaptureFormSchema.parse({
      lead_type: 'company',
      name: 'Laura Gómez',
      email: 'laura@colegio.co',
      phone: '3005556677',
      company_name: 'Colegio Andes',
      company_nit: '900123456-1',
      contact_role: 'Coordinadora',
      company_kind: 'colegio',
      location: 'El Retiro',
      approx_children: 40,
      need: 'Clases de natación extracurriculares',
    });
    expect(parsed.lead_type).toBe('company');
    expect(parsed.service_mode).toBe('institutional');
    expect(parsed.name).toBe('Laura Gómez');
    if (parsed.lead_type === 'company') {
      expect(parsed.company_nit).toBe('900123456-1');
    }
  });

  it('rejects names shorter than 2 characters', () => {
    const result = leadCaptureFormSchema.safeParse({ ...legacyFamily, name: 'A' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid email', () => {
    const result = leadCaptureFormSchema.safeParse({ ...legacyFamily, email: 'not-an-email' });
    expect(result.success).toBe(false);
  });

  it('rejects empty phone on legacy family', () => {
    const result = leadCaptureFormSchema.safeParse({ ...legacyFamily, phone: '' });
    expect(result.success).toBe(false);
  });

  it('requires grade_interested enum on legacy family', () => {
    const result = leadCaptureFormSchema.safeParse({ ...legacyFamily, grade_interested: '3A' });
    expect(result.success).toBe(false);
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

  it('requires explicit identity-document consent when a family cédula is submitted', () => {
    const withoutDocumentConsent = leadApiPostSchema.safeParse({
      lead_type: 'family',
      name: 'Ana López',
      email: 'ana@peskids.co',
      phone: '3001112233',
      child_name: 'Mateo López',
      birth_date: '2018-05-10',
      document_number: '1234567890',
      class_modality: 'llanogrande',
      consent_treatment: true,
      consent_identity_document: false,
    });

    expect(withoutDocumentConsent.success).toBe(false);

    const withDocumentConsent = leadApiPostSchema.safeParse({
      lead_type: 'family',
      name: 'Ana López',
      email: 'ana@peskids.co',
      phone: '3001112233',
      child_name: 'Mateo López',
      birth_date: '2018-05-10',
      document_number: '1234567890',
      class_modality: 'llanogrande',
      consent_treatment: true,
      consent_identity_document: true,
    });

    expect(withDocumentConsent.success).toBe(true);
  });

  it('accepts legacy payload with consent', () => {
    const parsed = leadApiPostSchema.parse({
      name: 'Ana López',
      email: 'ana@peskids.co',
      phone: '3001112233',
      class_modality: 'domicilio',
      neighborhood: 'Envigado',
      grade_interested: '6-8',
      consent_treatment: true,
      consent_marketing: false,
    });
    expect(parsed.consent_treatment).toBe(true);
    expect(parsed.lead_type).toBe('family');
  });

  it('rejects tenant or role authority keys', () => {
    const result = leadApiPostSchema.safeParse({
      name: 'Ana López',
      email: 'ana@peskids.co',
      class_modality: 'domicilio',
      neighborhood: 'Envigado',
      grade_interested: '6-8',
      consent_treatment: true,
      tenant_slug: 'other-tenant',
    });
    expect(result.success).toBe(false);
  });
});

describe('toCreateLeadInput', () => {
  it('maps form name to full_name for services', () => {
    const input = toCreateLeadInput({
      name: 'Carlos Ruiz',
      email: 'carlos@peskids.co',
      phone: '3001112233',
      class_modality: 'llanogrande',
      neighborhood: 'Rionegro',
      grade_interested: '9-12',
      lead_type: 'family',
      service_mode: 'llanogrande',
      city: undefined,
      metadata: { intake_version: 'legacy-family-v1' },
    });
    expect(input.full_name).toBe('Carlos Ruiz');
    expect(input.source).toBe('web');
  });
});

describe('externalLeadIntakeSchema', () => {
  it('validates the minimal parent/child intake fields', () => {
    const parsed = externalLeadIntakeSchema.parse({
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
