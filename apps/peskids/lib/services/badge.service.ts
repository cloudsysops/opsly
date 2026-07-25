import { supabaseServer } from '@/lib/supabase';
import type { Database } from '@/lib/types';

export type StudentBadge = Database['peskids']['Tables']['student_badges']['Row'];

function tenantSlug(): string {
  return (process.env.NEXT_PUBLIC_TENANT_ID || 'peskids').trim().toLowerCase();
}

function peskidsClient() {
  return supabaseServer().schema('peskids');
}

export async function listBadgesForStudent(studentId: string): Promise<StudentBadge[]> {
  const { data, error } = await peskidsClient()
    .from('student_badges')
    .select('*')
    .eq('tenant_slug', tenantSlug())
    .eq('student_id', studentId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as StudentBadge[];
}

export async function listBadgesForStudents(studentIds: string[]): Promise<StudentBadge[]> {
  if (studentIds.length === 0) return [];

  const { data, error } = await peskidsClient()
    .from('student_badges')
    .select('*')
    .eq('tenant_slug', tenantSlug())
    .in('student_id', studentIds)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as StudentBadge[];
}

export async function createBadge(input: {
  studentId: string;
  label: string;
  classId?: string | null;
  awardedBy: string | null;
  awardedByRole: 'owner' | 'admin' | 'support' | 'teacher' | null;
}): Promise<StudentBadge> {
  const { data, error } = await peskidsClient()
    .from('student_badges')
    .insert({
      tenant_slug: tenantSlug(),
      student_id: input.studentId,
      label: input.label,
      class_id: input.classId ?? null,
      awarded_by: input.awardedBy,
      awarded_by_role: input.awardedByRole,
    })
    .select('*')
    .single();

  if (error) throw error;
  return data as StudentBadge;
}

/**
 * A teacher can only badge students they've actually taught — same ownership
 * scoping as the attendance route (classItem.professor_user_id check), just
 * resolved across all of the student's enrollments instead of one classId.
 */
export async function teacherTaughtStudent(teacherId: string, studentId: string): Promise<boolean> {
  const { data, error } = await peskidsClient()
    .from('class_enrollments')
    .select('classes(professor_user_id)')
    .eq('tenant_slug', tenantSlug())
    .eq('student_id', studentId);

  if (error || !data) return false;

  return (
    data as Array<{ classes: { professor_user_id: string } | null }>
  ).some((row) => row.classes?.professor_user_id === teacherId);
}
