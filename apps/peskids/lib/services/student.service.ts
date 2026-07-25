import { supabaseServer } from '@/lib/supabase';
import type { Database } from '@/lib/types';
import type { createStudentSchema, updateStudentSchema } from '@/lib/validation/student.schema';
import type { z } from 'zod';

type StudentRow = Database['public']['Tables']['students']['Row'];

function tenantSlug(): string {
  return (process.env.NEXT_PUBLIC_TENANT_ID || 'peskids').trim().toLowerCase();
}

/**
 * Active students belonging to a family portal user, matched by
 * family_user_id or parent_email. Falls back to a parent_email-only query if
 * the family_user_id column errors (older rows/schema drift).
 */
export async function listFamilyStudents(
  user: { id: string; email?: string | null }
): Promise<Array<Pick<StudentRow, 'id' | 'name' | 'grade' | 'status'>>> {
  const email = user.email?.trim().toLowerCase();

  let query = supabaseServer()
    .from('students')
    .select('id, name, grade, status')
    .eq('tenant_id', tenantSlug())
    .eq('status', 'active');

  query = email
    ? query.or(`family_user_id.eq.${user.id},parent_email.ilike.${email}`)
    : query.eq('family_user_id', user.id);

  const { data, error } = await query.order('name');

  if (error?.message?.includes('family_user_id')) {
    const fallback = await supabaseServer()
      .from('students')
      .select('id, name, grade, status')
      .eq('tenant_id', tenantSlug())
      .eq('status', 'active')
      .ilike('parent_email', email ?? '')
      .order('name');
    if (fallback.error) throw fallback.error;
    return fallback.data ?? [];
  }

  if (error) throw error;
  return data ?? [];
}

export async function listStudents(input: {
  search?: string;
  grade?: string;
  status?: string;
}): Promise<StudentRow[]> {
  let query = supabaseServer()
    .from('students')
    .select('*')
    .eq('tenant_id', tenantSlug())
    .order('name');

  if (input.grade) {
    query = query.eq('grade', input.grade);
  }
  if (input.status) {
    query = query.eq('status', input.status as 'active' | 'inactive');
  }
  if (input.search) {
    query = query.or(`name.ilike.%${input.search}%,parent_email.ilike.%${input.search}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function createStudent(
  input: z.infer<typeof createStudentSchema>
): Promise<StudentRow> {
  const { data, error } = await supabaseServer()
    .from('students')
    .insert({
      tenant_id: tenantSlug(),
      name: input.name,
      grade: input.grade,
      parent_email: input.parent_email ?? null,
      parent_phone: input.parent_phone ?? null,
      enrollment_date: input.enrollment_date,
      notes: input.notes ?? null,
    })
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function getStudentById(studentId: string): Promise<StudentRow | null> {
  const { data, error } = await supabaseServer()
    .from('students')
    .select('*')
    .eq('id', studentId)
    .eq('tenant_id', tenantSlug())
    .maybeSingle();

  if (error) throw error;
  return data ?? null;
}

export async function updateStudent(
  studentId: string,
  input: z.infer<typeof updateStudentSchema>
): Promise<StudentRow> {
  const existing = await getStudentById(studentId);
  if (!existing) {
    throw new Error('Student not found');
  }

  const patch: Database['public']['Tables']['students']['Update'] = {
    updated_at: new Date().toISOString(),
  };
  if (input.name !== undefined) patch.name = input.name;
  if (input.grade !== undefined) patch.grade = input.grade;
  if (input.status !== undefined) patch.status = input.status;
  if (input.parent_email !== undefined) patch.parent_email = input.parent_email;
  if (input.parent_phone !== undefined) patch.parent_phone = input.parent_phone;
  if (input.notes !== undefined) patch.notes = input.notes;

  const { data, error } = await supabaseServer()
    .from('students')
    .update(patch)
    .eq('id', studentId)
    .eq('tenant_id', tenantSlug())
    .select('*')
    .single();

  if (error) throw error;
  return data;
}
