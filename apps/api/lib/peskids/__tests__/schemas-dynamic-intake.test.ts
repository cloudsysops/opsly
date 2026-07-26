import { describe, expect, it } from 'vitest';
import { peskidsLeadBodySchema } from '../schemas';

describe('peskidsLeadBodySchema', () => {
  it('accepts legacy family payload and defaults lead_type', () => {
    const parsed = peskidsLeadBodySchema.parse({
      name: 'Ana López',
      email: 'ana@peskids.co',
      class_modality: 'llanogrande',
      grade_interested: 'K-5',
    });
    expect(parsed.lead_type).toBe('family');
    expect(parsed.neighborhood).toBe('Llanogrande');
    expect(parsed.service_mode).toBe('llanogrande');
  });

  it('requires neighborhood for family domicilio', () => {
    const result = peskidsLeadBodySchema.safeParse({
      name: 'Ana López',
      email: 'ana@peskids.co',
      lead_type: 'family',
      class_modality: 'domicilio',
      grade_interested: 'K-5',
    });
    expect(result.success).toBe(false);
  });

  it('accepts teacher with document_number', () => {
    const parsed = peskidsLeadBodySchema.parse({
      name: 'Carlos Ruiz',
      email: 'carlos@peskids.co',
      phone: '3001112233',
      lead_type: 'teacher_applicant',
      class_modality: 'llanogrande',
      grade_interested: 'Other',
      document_type: 'CC',
      document_number: '1122334455',
      metadata: { experience: '5 años' },
    });
    expect(parsed.document_number).toBe('1122334455');
    expect(parsed.lead_type).toBe('teacher_applicant');
  });

  it('requires company_nit for company leads', () => {
    const result = peskidsLeadBodySchema.safeParse({
      name: 'Laura Gómez',
      email: 'laura@colegio.co',
      lead_type: 'company',
      class_modality: 'llanogrande',
      grade_interested: 'Other',
      company_name: 'Colegio Andes',
    });
    expect(result.success).toBe(false);
  });

  it('accepts company with NIT and sets institutional service_mode', () => {
    const parsed = peskidsLeadBodySchema.parse({
      name: 'Laura Gómez',
      email: 'laura@colegio.co',
      lead_type: 'company',
      class_modality: 'llanogrande',
      grade_interested: 'Other',
      company_name: 'Colegio Andes',
      company_nit: '900123456-1',
      neighborhood: 'El Retiro',
    });
    expect(parsed.company_nit).toBe('900123456-1');
    expect(parsed.service_mode).toBe('institutional');
  });
});
