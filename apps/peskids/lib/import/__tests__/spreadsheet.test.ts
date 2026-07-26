import { describe, expect, it } from 'vitest';
import {
  mapRowToStaffDraft,
  mapRowToStudentDraft,
  parseCsvText,
} from '@/lib/import/spreadsheet';

describe('spreadsheet import', () => {
  it('parses CSV and maps student columns in Spanish', () => {
    const csv = [
      'Nombre,Edad,Email acudiente,Teléfono',
      'Sofía Ramírez,4 años,mama@correo.com,3001234567',
      ',,,',
      'Lucas,6,papa@correo.com,+57 301 999 8888',
    ].join('\n');

    const parsed = parseCsvText(csv);
    expect(parsed.rows).toHaveLength(2);

    const first = mapRowToStudentDraft(parsed.rows[0]);
    expect(first?.name).toBe('Sofía Ramírez');
    expect(first?.grade).toContain('4');
    expect(first?.parent_email).toBe('mama@correo.com');
    expect(first?.parent_phone).toContain('3001234567');
  });

  it('maps staff roles from common headers', () => {
    const draft = mapRowToStaffDraft({
      Correo: 'profe@peskids.com',
      Nombre: 'Ana Profe',
      Rol: 'Profesor',
    });
    expect(draft).toEqual({
      email: 'profe@peskids.com',
      name: 'Ana Profe',
      role: 'teacher',
    });
  });
});
