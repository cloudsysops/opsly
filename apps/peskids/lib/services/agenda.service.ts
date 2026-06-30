import { supabaseServer } from '@/lib/supabase';
import type { AgendaItem, PeskidsClassEnrollment } from '@/lib/class-types';
import { listClasses } from '@/lib/services/class.service';

function tenantSlug(): string {
  return (process.env.NEXT_PUBLIC_TENANT_ID || 'peskids').trim().toLowerCase();
}

function peskidsClient() {
  return supabaseServer().schema('peskids');
}

export async function listAdminAgenda(input: {
  from: string;
  to: string;
}): Promise<AgendaItem[]> {
  const classes = await listClasses({
    from: input.from,
    to: input.to,
  });

  return classes.map((classItem) => ({
    id: classItem.id,
    class_id: classItem.id,
    title: classItem.title,
    starts_at: classItem.starts_at,
    ends_at: classItem.ends_at,
    location: classItem.location,
    status: classItem.status,
    pool_name: classItem.pool_name,
    enrolled_count: classItem.enrolled_count,
    capacity: classItem.capacity,
  }));
}

export async function listTeacherAgenda(input: {
  teacherUserId: string;
  from: string;
  to: string;
}): Promise<AgendaItem[]> {
  const classes = await listClasses({
    from: input.from,
    to: input.to,
    professorUserId: input.teacherUserId,
  });

  return classes.map((classItem) => ({
    id: classItem.id,
    class_id: classItem.id,
    title: classItem.title,
    starts_at: classItem.starts_at,
    ends_at: classItem.ends_at,
    location: classItem.location,
    status: classItem.status,
    pool_name: classItem.pool_name,
    enrolled_count: classItem.enrolled_count,
    capacity: classItem.capacity,
  }));
}

export async function listFamilyAgenda(input: {
  familyUserId: string;
  from: string;
  to: string;
}): Promise<AgendaItem[]> {
  const { data, error } = await peskidsClient()
    .from('class_enrollments')
    .select('*, classes!inner(id, title, starts_at, ends_at, location, status, capacity, pool_id)')
    .eq('tenant_slug', tenantSlug())
    .eq('family_user_id', input.familyUserId)
    .not('status', 'eq', 'cancelled')
    .gte('classes.starts_at', input.from)
    .lte('classes.starts_at', input.to)
    .order('joined_at', { ascending: true });

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as Array<
    PeskidsClassEnrollment & {
      classes: {
        id: string;
        title: string;
        starts_at: string;
        ends_at: string;
        location: AgendaItem['location'];
        status: AgendaItem['status'];
        capacity: number;
        pool_id: string;
      } | null;
    }
  >;

  if (rows.length === 0) {
    return [];
  }

  const studentIds = [...new Set(rows.map((row) => row.student_id))];
  const poolIds = [...new Set(rows.map((row) => row.classes?.pool_id).filter(Boolean))] as string[];

  const [studentsResult, poolsResult] = await Promise.all([
    supabaseServer()
      .from('students')
      .select('id, name')
      .in('id', studentIds),
    peskidsClient()
      .from('pools')
      .select('id, name')
      .in('id', poolIds),
  ]);

  if (studentsResult.error) {
    throw studentsResult.error;
  }
  if (poolsResult.error) {
    throw poolsResult.error;
  }

  const studentNameById = new Map(
    (studentsResult.data ?? []).map((student) => [student.id, student.name])
  );
  const poolNameById = new Map(
    (poolsResult.data ?? []).map((pool) => [pool.id, pool.name])
  );

  return rows
    .filter((row) => row.classes)
    .map((row) => ({
      id: row.id,
      class_id: row.classes!.id,
      title: row.classes!.title,
      starts_at: row.classes!.starts_at,
      ends_at: row.classes!.ends_at,
      location: row.classes!.location,
      status: row.classes!.status,
      pool_name: poolNameById.get(row.classes!.pool_id),
      capacity: row.classes!.capacity,
      student_id: row.student_id,
      student_name: studentNameById.get(row.student_id),
      enrollment_status: row.status,
      payment_status: row.payment_status,
      attendance: row.attendance,
    }))
    .sort((left, right) => left.starts_at.localeCompare(right.starts_at));
}
