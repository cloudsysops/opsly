-- Peskids: classes, enrollments, pools, payments (operations MVP)
CREATE SCHEMA IF NOT EXISTS peskids;

CREATE TABLE IF NOT EXISTS peskids.pools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_slug text NOT NULL DEFAULT 'peskids',
  name text NOT NULL,
  location text NOT NULL CHECK (location IN ('llanogrande', 'domicilio')),
  max_capacity integer NOT NULL CHECK (max_capacity > 0),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS peskids.classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_slug text NOT NULL DEFAULT 'peskids',
  title text NOT NULL,
  level smallint NOT NULL CHECK (level BETWEEN 1 AND 6),
  professor_user_id uuid NOT NULL,
  pool_id uuid NOT NULL REFERENCES peskids.pools(id),
  location text NOT NULL CHECK (location IN ('llanogrande', 'domicilio')),
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  capacity integer NOT NULL CHECK (capacity > 0),
  price_cents integer NOT NULL CHECK (price_cents >= 0),
  currency text NOT NULL DEFAULT 'cop',
  status text NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'cancelled', 'completed')),
  cancelled_reason text,
  series_id uuid,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT classes_time_order CHECK (ends_at > starts_at)
);

CREATE INDEX IF NOT EXISTS idx_classes_tenant_starts ON peskids.classes (tenant_slug, starts_at);
CREATE INDEX IF NOT EXISTS idx_classes_professor_starts ON peskids.classes (professor_user_id, starts_at);
CREATE INDEX IF NOT EXISTS idx_classes_pool_starts ON peskids.classes (pool_id, starts_at);
CREATE INDEX IF NOT EXISTS idx_classes_status ON peskids.classes (status) WHERE status = 'scheduled';

CREATE TABLE IF NOT EXISTS peskids.class_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_slug text NOT NULL DEFAULT 'peskids',
  class_id uuid NOT NULL REFERENCES peskids.classes(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id),
  family_user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'reserved'
    CHECK (status IN ('reserved', 'confirmed', 'cancelled', 'no_show', 'attended')),
  payment_status text NOT NULL DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  attendance text CHECK (attendance IN ('present', 'absent', 'excused')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  cancelled_at timestamptz,
  stripe_checkout_session_id text
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_enrollment_active_student
  ON peskids.class_enrollments (class_id, student_id)
  WHERE status NOT IN ('cancelled');

CREATE INDEX IF NOT EXISTS idx_enrollments_class ON peskids.class_enrollments (class_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_family ON peskids.class_enrollments (family_user_id, joined_at DESC);

CREATE TABLE IF NOT EXISTS peskids.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_slug text NOT NULL DEFAULT 'peskids',
  family_user_id uuid NOT NULL,
  enrollment_id uuid REFERENCES peskids.class_enrollments(id),
  amount_cents integer NOT NULL CHECK (amount_cents >= 0),
  currency text NOT NULL DEFAULT 'cop',
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'failed', 'refunded')),
  stripe_payment_intent_id text,
  stripe_checkout_session_id text,
  paid_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_status ON peskids.payments (status) WHERE status = 'pending';

ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS family_user_id uuid;

CREATE INDEX IF NOT EXISTS idx_students_family_user ON public.students (family_user_id)
  WHERE family_user_id IS NOT NULL;

ALTER TABLE peskids.pools ENABLE ROW LEVEL SECURITY;
ALTER TABLE peskids.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE peskids.class_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE peskids.payments ENABLE ROW LEVEL SECURITY;
