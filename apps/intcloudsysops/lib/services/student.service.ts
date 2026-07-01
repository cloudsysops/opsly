import { supabaseServer } from '@/lib/supabase';
import type { Database } from '@/lib/types';
import type { createStudentSchema, updateStudentSchema } from '@/lib/validation/student.schema';
import type { z } from 'zod';

type StudentRow = Database['public']['Tables']['students']['Row'];

function tenantSlug(): string {
  return (process.env.NEXT_PUBLIC_TENANT_ID || 'peskids').trim().toLowerCase();
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
