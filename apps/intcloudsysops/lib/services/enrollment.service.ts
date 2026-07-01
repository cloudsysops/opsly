import type { User } from '@supabase/supabase-js';
import { supabaseServer } from '@/lib/supabase';
import type { Database } from '@/lib/types';
import {
  ClassCapacityError,
  EnrollmentNotAllowedError,
  type PeskidsClassEnrollment,
} from '@/lib/class-types';
import { getClassById } from '@/lib/services/class.service';

const CANCEL_MIN_HOURS = 24;

function tenantSlug(): string {
  return (process.env.NEXT_PUBLIC_TENANT_ID || 'peskids').trim().toLowerCase();
}

function peskidsClient() {
  return supabaseServer().schema('peskids');
}

export async function studentBelongsToFamily(
  studentId: string,
  user: User
): Promise<boolean> {
  const client = supabaseServer();
  const email = user.email?.trim().toLowerCase();

  const { data, error } = await client
    .from('students')
    .select('id, parent_email, family_user_id')
    .eq('id', studentId)
    .eq('tenant_id', tenantSlug())
    .maybeSingle();

  if (error || !data) return false;

  const row = data as {
    id: string;
    parent_email: string | null;
    family_user_id: string | null;
  };

  if (row.family_user_id && row.family_user_id === user.id) {
    return true;
  }

  if (email && row.parent_email?.trim().toLowerCase() === email) {
    return true;
  }

  return false;
}

export async function listEnrollmentsForClass(
  classId: string
): Promise<
  Array<
    PeskidsClassEnrollment & {
      student_name?: string;
      parent_email?: string | null;
    }
  >
> {
  const { data, error } = await peskidsClient()
    .from('class_enrollments')
    .select('*')
    .eq('class_id', classId)
    .eq('tenant_slug', tenantSlug())
    .order('joined_at', { ascending: false });

  if (error) throw error;

  const enrollments = (data ?? []) as PeskidsClassEnrollment[];
  if (enrollments.length === 0) return [];

  const studentIds = [...new Set(enrollments.map((e) => e.student_id))];
  const { data: students } = await supabaseServer()
    .from('students')
    .select('id, name, parent_email')
    .in('id', studentIds);

  const studentMap = new Map(
    (students ?? []).map((s) => [
      (s as { id: string }).id,
      s as { id: string; name: string; parent_email: string | null },
    ])
  );

  return enrollments.map((enrollment) => {
    const student = studentMap.get(enrollment.student_id);
    return {
      ...enrollment,
      student_name: student?.name,
      parent_email: student?.parent_email ?? null,
    };
  });
}

export async function listFamilyEnrollments(
  familyUserId: string
): Promise<
  Array<
    PeskidsClassEnrollment & {
      class_title?: string;
      starts_at?: string;
      ends_at?: string;
    }
  >
> {
  const { data, error } = await peskidsClient()
    .from('class_enrollments')
    .select('*, classes(title, starts_at, ends_at, status)')
    .eq('family_user_id', familyUserId)
    .eq('tenant_slug', tenantSlug())
    .not('status', 'eq', 'cancelled')
    .order('joined_at', { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row) => {
    const typed = row as PeskidsClassEnrollment & {
      classes: { title: string; starts_at: string; ends_at: string; status: string } | null;
    };
    return {
      ...typed,
      class_title: typed.classes?.title,
      starts_at: typed.classes?.starts_at,
      ends_at: typed.classes?.ends_at,
    };
  });
}

export async function createEnrollment(input: {
  classId: string;
  studentId: string;
  familyUserId: string;
}): Promise<{
  enrollment: PeskidsClassEnrollment;
  payment_required: boolean;
}> {
  const classItem = await getClassById(input.classId);
  if (!classItem || classItem.status !== 'scheduled') {
    throw new EnrollmentNotAllowedError('Class not available');
  }

  if (classItem.enrolled_count >= classItem.capacity) {
    throw new ClassCapacityError();
  }

  if (new Date(classItem.starts_at).getTime() <= Date.now()) {
    throw new EnrollmentNotAllowedError('Class already started');
  }

  const { data, error } = await peskidsClient()
    .from('class_enrollments')
    .insert({
      tenant_slug: tenantSlug(),
      class_id: input.classId,
      student_id: input.studentId,
      family_user_id: input.familyUserId,
      status: 'reserved',
      payment_status: classItem.price_cents === 0 ? 'paid' : 'pending',
    })
    .select('*')
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new EnrollmentNotAllowedError('Student already enrolled');
    }
    throw error;
  }

  const enrollment = data as PeskidsClassEnrollment;

  if (classItem.price_cents === 0) {
    await peskidsClient()
      .from('class_enrollments')
      .update({ status: 'confirmed' })
      .eq('id', enrollment.id);
    enrollment.status = 'confirmed';
  }

  return {
    enrollment,
    payment_required: classItem.price_cents > 0,
  };
}

export async function cancelEnrollment(
  enrollmentId: string,
  familyUserId: string
): Promise<PeskidsClassEnrollment> {
  const { data: enrollment, error } = await peskidsClient()
    .from('class_enrollments')
    .select('*, classes(starts_at)')
    .eq('id', enrollmentId)
    .eq('family_user_id', familyUserId)
    .maybeSingle();

  if (error) throw error;
  if (!enrollment) {
    throw new EnrollmentNotAllowedError('Enrollment not found');
  }

  const row = enrollment as PeskidsClassEnrollment & {
    classes: { starts_at: string } | null;
  };

  const startsAt = row.classes?.starts_at;
  if (startsAt) {
    const hoursUntil =
      (new Date(startsAt).getTime() - Date.now()) / (1000 * 60 * 60);
    if (hoursUntil < CANCEL_MIN_HOURS) {
      throw new EnrollmentNotAllowedError(
        `Cancelación permitida hasta ${CANCEL_MIN_HOURS}h antes`
      );
    }
  }

  const { data: updated, error: updateError } = await peskidsClient()
    .from('class_enrollments')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
    })
    .eq('id', enrollmentId)
    .select('*')
    .single();

  if (updateError) throw updateError;
  return updated as PeskidsClassEnrollment;
}

export async function updateAttendance(
  classId: string,
  updates: Array<{ enrollment_id: string; attendance: 'present' | 'absent' | 'excused' }>
): Promise<number> {
  let count = 0;
  for (const item of updates) {
    const patch: Database['peskids']['Tables']['class_enrollments']['Update'] = {
      attendance: item.attendance,
    };
    if (item.attendance === 'present') {
      patch.status = 'attended';
    }

    const { error } = await peskidsClient()
      .from('class_enrollments')
      .update(patch)
      .eq('id', item.enrollment_id)
      .eq('class_id', classId)
      .eq('tenant_slug', tenantSlug());

    if (error) throw error;
    count += 1;
  }
  return count;
}
