-- Free-form badges/achievements per student (e.g. "Primera clase completada",
-- "Burbujas", "Flota solo"), assignable by admin/support/owner or the
-- teacher who actually taught the student. Safe to re-run (IF NOT EXISTS).

BEGIN;

CREATE TABLE IF NOT EXISTS peskids.student_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_slug text NOT NULL DEFAULT 'peskids',
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  label text NOT NULL,
  class_id uuid REFERENCES peskids.classes(id) ON DELETE SET NULL,
  awarded_by uuid,
  awarded_by_role text
    CHECK (awarded_by_role IS NULL OR awarded_by_role IN ('owner', 'admin', 'support', 'teacher')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_student_badges_tenant_student
  ON peskids.student_badges (tenant_slug, student_id, created_at DESC);

ALTER TABLE peskids.student_badges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_all_student_badges" ON peskids.student_badges;
CREATE POLICY "service_role_all_student_badges"
  ON peskids.student_badges
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON peskids.student_badges TO service_role;

COMMIT;
