export type SwimLocation = 'llanogrande' | 'domicilio';
export type ClassStatus = 'scheduled' | 'cancelled' | 'completed';
export type EnrollmentStatus =
  | 'reserved'
  | 'confirmed'
  | 'cancelled'
  | 'no_show'
  | 'attended'
  | 'waitlisted';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';
export type AttendanceStatus = 'present' | 'absent' | 'excused';
export type BehaviorTag =
  | 'happy'
  | 'engaged'
  | 'calm'
  | 'shy'
  | 'tired'
  | 'needs_support'
  | 'other';

export interface PeskidsPool {
  id: string;
  tenant_slug: string;
  franchise_id?: string | null;
  name: string;
  location: SwimLocation;
  max_capacity: number;
  active: boolean;
  created_at: string;
}

export interface PeskidsClass {
  id: string;
  tenant_slug: string;
  franchise_id?: string | null;
  title: string;
  level: number;
  professor_user_id: string;
  pool_id: string;
  location: SwimLocation;
  starts_at: string;
  ends_at: string;
  capacity: number;
  price_cents: number;
  currency: string;
  status: ClassStatus;
  cancelled_reason: string | null;
  session_notes: string | null;
  series_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PeskidsClassEnrollment {
  id: string;
  tenant_slug: string;
  class_id: string;
  student_id: string;
  family_user_id: string;
  status: EnrollmentStatus;
  payment_status: PaymentStatus;
  attendance: AttendanceStatus | null;
  behavior_tags: BehaviorTag[];
  teacher_note: string | null;
  attendance_updated_at: string | null;
  attendance_updated_by: string | null;
  joined_at: string;
  cancelled_at: string | null;
  stripe_checkout_session_id: string | null;
}

export interface ClassListItem extends PeskidsClass {
  enrolled_count: number;
  pool_name?: string;
}

export interface AgendaItem {
  id: string;
  class_id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  location: SwimLocation;
  status: ClassStatus;
  pool_name?: string;
  enrolled_count?: number;
  capacity?: number;
  student_id?: string;
  student_name?: string;
  enrollment_status?: EnrollmentStatus;
  payment_status?: PaymentStatus;
  attendance?: AttendanceStatus | null;
  behavior_tags?: BehaviorTag[];
  teacher_note?: string | null;
}

export interface OperationsMetrics {
  classes_today: number;
  enrollments_today: number;
  attendance_rate_pct: number | null;
  revenue_month_cents: number;
  revenue_month_by_provider: {
    stripe_cents: number;
    wompi_cents: number;
  };
  pending_payments_cents: number;
}

export class ClassScheduleConflictError extends Error {
  constructor(message = 'Professor or pool schedule conflict') {
    super(message);
    this.name = 'ClassScheduleConflictError';
  }
}

export class ClassCapacityError extends Error {
  constructor(message = 'Class is full') {
    super(message);
    this.name = 'ClassCapacityError';
  }
}

export class EnrollmentNotAllowedError extends Error {
  constructor(message = 'Enrollment not allowed') {
    super(message);
    this.name = 'EnrollmentNotAllowedError';
  }
}
