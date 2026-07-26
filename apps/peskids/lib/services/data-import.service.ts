import { createStudent } from '@/lib/services/student.service';
import { invitePeskidsTeamMember } from '@/lib/team-management';
import type { z } from 'zod';
import type { staffImportBodySchema, studentImportBodySchema } from '@/lib/validation/improvement-chat.schema';

export type StudentImportResult = {
  ok: true;
  dry_run: boolean;
  created: number;
  failed: Array<{ index: number; name: string; error: string }>;
};

export type StaffImportResult = {
  ok: true;
  dry_run: boolean;
  invited: number;
  failed: Array<{ index: number; email: string; error: string }>;
};

export async function importStudentsFromRows(
  input: z.infer<typeof studentImportBodySchema>
): Promise<StudentImportResult> {
  const failed: StudentImportResult['failed'] = [];
  let created = 0;

  for (let index = 0; index < input.rows.length; index += 1) {
    const row = input.rows[index];
    try {
      if (!input.dry_run) {
        await createStudent({
          name: row.name,
          grade: row.grade || 'Por confirmar',
          parent_email: row.parent_email,
          parent_phone: row.parent_phone,
          notes: row.notes,
        });
      }
      created += 1;
    } catch (err) {
      failed.push({
        index,
        name: row.name,
        error: err instanceof Error ? err.message : 'No se pudo crear el alumno',
      });
    }
  }

  return { ok: true, dry_run: Boolean(input.dry_run), created, failed };
}

export async function importStaffFromRows(
  input: z.infer<typeof staffImportBodySchema>
): Promise<StaffImportResult> {
  const failed: StaffImportResult['failed'] = [];
  let invited = 0;

  for (let index = 0; index < input.rows.length; index += 1) {
    const row = input.rows[index];
    try {
      if (!input.dry_run) {
        await invitePeskidsTeamMember({
          email: row.email,
          name: row.name,
          role: row.role,
        });
      }
      invited += 1;
    } catch (err) {
      failed.push({
        index,
        email: row.email,
        error: err instanceof Error ? err.message : 'No se pudo invitar al miembro',
      });
    }
  }

  return { ok: true, dry_run: Boolean(input.dry_run), invited, failed };
}
