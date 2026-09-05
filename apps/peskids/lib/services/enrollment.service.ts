import type { User } from '@supabase/supabase-js';
import { supabaseServer } from '@/lib/supabase';
import type { Database } from '@/lib/types';
import { EnrollmentNotAllowedError, type PeskidsClassEnrollment } from '@/lib/class-types';
import { getClassById } from '@/lib/services/class.service';
import { toClassRosterEntry, type ClassRosterEntry } from '@/lib/privacy/pii-projections';

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

/**
 * Class roster.
 *
 * `includeGuardianContact` decides whether the guardian's email is part of the
 * response at all — when false the key is absent, not null. Taking attendance
 * does not require a guardian's address, so the teacher audience defaults to
 * excluded (see lib/privacy/pii-projections.ts).
 */
export async function listEnrollmentsForClass(
  classId: string,
  options: { includeGuardianContact: boolean } = { includeGuardianContact: false }
): Promise<ClassRosterEntry[]> {
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

  // Only ask the database for the guardian email when the caller is allowed it —
  // data that is never fetched cannot be leaked by a later refactor.
  const studentColumns = options.includeGuardianContact ? 'id, name, parent_email' : 'id, name';
  const { data: students } = await supabaseServer()
    .from('students')
    .select(studentColumns)
    .in('id', studentIds);

  const studentMap = new Map(
    ((students ?? []) as unknown as Array<{
      id: string;
      name: string;
      parent_email?: string | null;
    }>).map((s) => [s.id, s])
  );

  return enrollments.map((enrollment) => {
    const student = studentMap.get(enrollment.student_id);
    return toClassRosterEntry(
      {
        id: enrollment.id,
        class_id: enrollment.class_id,
        student_id: enrollment.student_id,
        status: enrollment.status,
        payment_status: enrollment.payment_status,
        attendance: enrollment.attendance ?? null,
        joined_at: enrollment.joined_at ?? null,
        student_name: student?.name,
        parent_email: student?.parent_email ?? null,
      },
      options
    );
  });
}

/** True when the class exists in this tenant and is taught by `userId`. */
export async function classBelongsToTeacher(classId: string, userId: string): Promise<boolean> {
  const { data, error } = await peskidsClient()
    .from('classes')
    .select('id, professor_user_id')
    .eq('id', classId)
    .eq('tenant_slug', tenantSlug())
    .maybeSingle();

  if (error || !data) return false;
  return (data as { professor_user_id: string | null }).professor_user_id === userId;
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
  waitlisted: boolean;
}> {
  const classItem = await getClassById(input.classId);
  if (!classItem || classItem.status !== 'scheduled') {
    throw new EnrollmentNotAllowedError('Class not available');
  }

  if (new Date(classItem.starts_at).getTime() <= Date.now()) {
    throw new EnrollmentNotAllowedError('Class already started');
  }

  const waitlisted = classItem.enrolled_count >= classItem.capacity;

  const { data, error } = await peskidsClient()
    .from('class_enrollments')
    .insert({
      tenant_slug: tenantSlug(),
      class_id: input.classId,
      student_id: input.studentId,
      family_user_id: input.familyUserId,
      status: waitlisted ? 'waitlisted' : 'reserved',
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

  if (!waitlisted && classItem.price_cents === 0) {
    await peskidsClient()
      .from('class_enrollments')
      .update({ status: 'confirmed' })
      .eq('id', enrollment.id);
    enrollment.status = 'confirmed';
  }

  return {
    enrollment,
    payment_required: !waitlisted && classItem.price_cents > 0,
    waitlisted,
  };
}

/**
 * Promotes the earliest waitlisted enrollment (FIFO by joined_at) once a seat
 * frees up. Mirrors createEnrollment's free-class auto-confirm: a waitlisted
 * entry for a free class already has payment_status 'paid' at insert time, so
 * it goes straight to 'confirmed' instead of 'reserved'. Best-effort — never
 * throws, since the cancellation itself has already succeeded by the time
 * this runs.
 */
async function promoteNextWaitlisted(classId: string): Promise<void> {
  try {
    const { data: next, error } = await peskidsClient()
      .from('class_enrollments')
      .select('id, payment_status')
      .eq('class_id', classId)
      .eq('status', 'waitlisted')
      .order('joined_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error || !next) return;

    const row = next as { id: string; payment_status: PeskidsClassEnrollment['payment_status'] };
    await peskidsClient()
      .from('class_enrollments')
      .update({ status: row.payment_status === 'paid' ? 'confirmed' : 'reserved' })
      .eq('id', row.id);
  } catch (err) {
    console.warn('[enrollment] waitlist promotion failed', {
      class_id: classId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
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

  // A waitlisted entry doesn't hold a seat, so the pre-class cancel window
  // that protects against last-minute seat abandonment doesn't apply to it.
  const startsAt = row.classes?.starts_at;
  if (startsAt && row.status !== 'waitlisted') {
    const hoursUntil =
      (new Date(startsAt).getTime() - Date.now()) / (1000 * 60 * 60);
    if (hoursUntil < CANCEL_MIN_HOURS) {
      throw new EnrollmentNotAllowedError(
        `Cancelación permitida hasta ${CANCEL_MIN_HOURS}h antes`
      );
    }
  }

  const heldSeat = row.status === 'reserved' || row.status === 'confirmed';

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

  if (heldSeat) {
    await promoteNextWaitlisted(row.class_id);
  }

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
