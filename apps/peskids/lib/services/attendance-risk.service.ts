import { supabaseServer } from '@/lib/supabase';
import { agingIdempotencyKey } from '@/lib/lead-aging';
import { countConsecutiveAbsences, type ClassEnrollmentRecord } from '@/lib/attendance-risk';
import {
  getPeskidsAttendanceRiskThreshold,
  isPeskidsAttendanceRiskAlertEnabled,
} from '@/lib/peskids-pro-flags';
import { createFollowup } from '@/lib/services/followup-admin.service';
import { emitStudentAttendanceRisk } from '@/lib/events';

function tenantSlug(): string {
  return (process.env.NEXT_PUBLIC_TENANT_ID || 'peskids').trim().toLowerCase();
}

function peskidsClient() {
  return supabaseServer().schema('peskids');
}

function platformFrom(table: string) {
  const client = supabaseServer() as {
    schema: (name: string) => {
      from: (tableName: string) => ReturnType<ReturnType<typeof supabaseServer>['from']>;
    };
  };
  return client.schema('platform').from(table);
}

export type AttendanceRiskScanResult = {
  scanned_students: number;
  at_risk: number;
  auto_followups_created: number;
  skipped: number;
  failed: number;
};

async function claimAttendanceRiskIdempotency(
  studentId: string,
  windowKey: string
): Promise<{ claimed: boolean; key: string }> {
  const key = agingIdempotencyKey('attendance_risk', studentId, windowKey);
  const { error } = await platformFrom('peskids_aging_alert_deliveries').insert({
    tenant_slug: tenantSlug(),
    alert_kind: 'attendance_risk',
    entity_type: 'student',
    entity_id: studentId,
    idempotency_key: key,
    status: 'pending',
  });

  if (error) {
    const code = (error as { code?: string }).code;
    const msg = error.message?.toLowerCase() ?? '';
    if (code === '23505' || msg.includes('duplicate') || msg.includes('unique')) {
      return { claimed: false, key };
    }
    console.warn('[attendance-risk] idempotency insert failed', error.message);
    return { claimed: false, key };
  }
  return { claimed: true, key };
}

async function markDelivery(
  key: string,
  status: 'sent' | 'failed' | 'skipped',
  detail: string
): Promise<void> {
  const patch: Record<string, string | null> = {
    status,
    detail: detail.slice(0, 500),
    updated_at: new Date().toISOString(),
  };
  if (status === 'sent') {
    patch.sent_at = new Date().toISOString();
  }
  await platformFrom('peskids_aging_alert_deliveries')
    .update(patch)
    .eq('idempotency_key', key);
}

/**
 * Flags active students with `threshold`+ consecutive class absences
 * (retention risk) and auto-creates a followup. Idempotent per calendar-day
 * window per student via platform.peskids_aging_alert_deliveries — mirrors
 * lead-aging.service.ts. Never throws; feature flag defaults off so
 * production behavior is unchanged until Doppler enables it.
 */
export async function processAttendanceRisk(
  now: Date,
  windowKey: string
): Promise<AttendanceRiskScanResult> {
  const result: AttendanceRiskScanResult = {
    scanned_students: 0,
    at_risk: 0,
    auto_followups_created: 0,
    skipped: 0,
    failed: 0,
  };

  if (!isPeskidsAttendanceRiskAlertEnabled()) {
    return result;
  }

  const threshold = getPeskidsAttendanceRiskThreshold();

  const { data: students, error: studentsError } = await supabaseServer()
    .from('students')
    .select('id')
    .eq('tenant_id', tenantSlug())
    .eq('status', 'active')
    .limit(500);

  if (studentsError) {
    console.warn('[attendance-risk] students query failed', studentsError.message);
    return result;
  }

  const studentIds = (students ?? []).map((row) => (row as { id: string }).id);
  if (studentIds.length === 0) {
    return result;
  }
  result.scanned_students = studentIds.length;

  const { data: enrollments, error: enrollmentsError } = await peskidsClient()
    .from('class_enrollments')
    .select('student_id, status, attendance, classes(starts_at)')
    .in('student_id', studentIds)
    .limit(2000);

  if (enrollmentsError) {
    console.warn('[attendance-risk] enrollments query failed', enrollmentsError.message);
    return result;
  }

  const byStudent = new Map<string, ClassEnrollmentRecord[]>();
  for (const row of (enrollments ?? []) as Array<{
    student_id: string;
    status: ClassEnrollmentRecord['status'];
    attendance: ClassEnrollmentRecord['attendance'];
    classes: { starts_at: string } | null;
  }>) {
    if (!row.classes?.starts_at) continue;
    const bucket = byStudent.get(row.student_id) ?? [];
    bucket.push({
      status: row.status,
      attendance: row.attendance,
      starts_at: row.classes.starts_at,
    });
    byStudent.set(row.student_id, bucket);
  }

  for (const [studentId, records] of byStudent) {
    const consecutive = countConsecutiveAbsences(records, now);
    if (consecutive < threshold) continue;

    const claim = await claimAttendanceRiskIdempotency(studentId, windowKey);
    if (!claim.claimed) {
      result.skipped += 1;
      continue;
    }

    result.at_risk += 1;

    try {
      const due = new Date(now);
      due.setDate(due.getDate() + 1);
      const followup = await createFollowup({
        contact_id: studentId,
        contact_type: 'student',
        type: 'call',
        due_date: due.toISOString().slice(0, 10),
        notes: `Auto: ${consecutive} ausencias consecutivas — riesgo de deserción`,
      });
      result.auto_followups_created += 1;
      await markDelivery(claim.key, 'sent', `followup ${followup.id} created`);
      void emitStudentAttendanceRisk({
        studentId,
        consecutiveAbsences: consecutive,
        followupId: followup.id,
      }).catch((err: unknown) => {
        console.warn('[attendance-risk] student.attendance_risk emit failed', {
          student_id: studentId,
          error: err instanceof Error ? err.message : String(err),
        });
      });
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      await markDelivery(claim.key, 'failed', detail);
      result.failed += 1;
    }
  }

  return result;
}
