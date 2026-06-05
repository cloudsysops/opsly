---
-- Phase 2 Week 1: Row Level Security Policies for Peskids
-- Status: Ready for deployment to Supabase project jkwykpldnitavhmtuzmo
-- Owner: cboteros1@gmail.com
-- Tables: leads, parents, students, classes, feedback, followups, messages
--
-- Roles:
--   admin (owner): sierrasantiago90@gmail.com — full access
--   staff: created_by matches auth.uid() — leads they created
--   teachers: teacher_id matches auth.uid() — their classes
--   parents: parent_id matches auth.uid() — their children
--
-- Instructions:
-- 1. Open Supabase SQL Editor: https://app.supabase.com/project/jkwykpldnitavhmtuzmo/sql
-- 2. Copy this entire file into the SQL Editor
-- 3. Execute (Ctrl+Enter or ⌘+Enter)
-- 4. Verify in Auth > Policies tab
-- 5. Test with different user roles
---

-- =============================================================================
-- FUNCTION: is_owner()
-- Helper to identify admin (owner) by email
-- =============================================================================

CREATE OR REPLACE FUNCTION is_owner()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN auth.email() = 'sierrasantiago90@gmail.com';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- TABLE: leads
-- Policies: admin (all), staff (own), service_role (backend)
-- =============================================================================

ALTER TABLE IF EXISTS leads ENABLE ROW LEVEL SECURITY;

-- Admin can read all leads
CREATE POLICY "admin_read_all_leads" ON leads
  FOR SELECT
  USING (is_owner());

-- Admin can insert leads
CREATE POLICY "admin_insert_leads" ON leads
  FOR INSERT
  WITH CHECK (is_owner());

-- Admin can update leads
CREATE POLICY "admin_update_leads" ON leads
  FOR UPDATE
  USING (is_owner())
  WITH CHECK (is_owner());

-- Admin can delete leads
CREATE POLICY "admin_delete_leads" ON leads
  FOR DELETE
  USING (is_owner());

-- Staff can read leads they created
CREATE POLICY "staff_read_own_leads" ON leads
  FOR SELECT
  USING (
    tenant_slug = 'peskids'
    AND (
      is_owner()
      OR (created_by IS NOT NULL AND created_by = auth.uid())
    )
  );

-- Staff can update leads they created
CREATE POLICY "staff_update_own_leads" ON leads
  FOR UPDATE
  USING (
    tenant_slug = 'peskids'
    AND (
      is_owner()
      OR (created_by IS NOT NULL AND created_by = auth.uid())
    )
  )
  WITH CHECK (
    tenant_slug = 'peskids'
    AND (
      is_owner()
      OR (created_by IS NOT NULL AND created_by = auth.uid())
    )
  );

-- Service role bypass (no policy affects service_role, only RLS for authenticated users)
-- Service role is used by backend API routes only

-- =============================================================================
-- TABLE: parents
-- Policies: admin (all), parents (own profile)
-- =============================================================================

ALTER TABLE IF EXISTS parents ENABLE ROW LEVEL SECURITY;

-- Admin can read all parents
CREATE POLICY "admin_read_all_parents" ON parents
  FOR SELECT
  USING (is_owner());

-- Admin can insert parents
CREATE POLICY "admin_insert_parents" ON parents
  FOR INSERT
  WITH CHECK (is_owner());

-- Admin can update parents
CREATE POLICY "admin_update_parents" ON parents
  FOR UPDATE
  USING (is_owner())
  WITH CHECK (is_owner());

-- Parents can read their own profile (auth.uid() should match parent user_id if linked)
CREATE POLICY "parent_read_own_profile" ON parents
  FOR SELECT
  USING (
    is_owner()
    OR (user_id IS NOT NULL AND user_id = auth.uid())
  );

-- Parents can update their own profile
CREATE POLICY "parent_update_own_profile" ON parents
  FOR UPDATE
  USING (
    is_owner()
    OR (user_id IS NOT NULL AND user_id = auth.uid())
  )
  WITH CHECK (
    is_owner()
    OR (user_id IS NOT NULL AND user_id = auth.uid())
  );

-- =============================================================================
-- TABLE: students
-- Policies: admin (all), parents (their children), teachers (their students)
-- =============================================================================

ALTER TABLE IF EXISTS students ENABLE ROW LEVEL SECURITY;

-- Admin can read all students
CREATE POLICY "admin_read_all_students" ON students
  FOR SELECT
  USING (is_owner());

-- Admin can insert students
CREATE POLICY "admin_insert_students" ON students
  FOR INSERT
  WITH CHECK (is_owner());

-- Admin can update students
CREATE POLICY "admin_update_students" ON students
  FOR UPDATE
  USING (is_owner())
  WITH CHECK (is_owner());

-- Parents can read their own children
CREATE POLICY "parent_read_own_children" ON students
  FOR SELECT
  USING (
    is_owner()
    OR (parent_id IS NOT NULL AND parent_id = auth.uid())
  );

-- Parents can update their own children's info
CREATE POLICY "parent_update_own_children" ON students
  FOR UPDATE
  USING (
    is_owner()
    OR (parent_id IS NOT NULL AND parent_id = auth.uid())
  )
  WITH CHECK (
    is_owner()
    OR (parent_id IS NOT NULL AND parent_id = auth.uid())
  );

-- Teachers can read students in their classes (via class_enrollments)
-- This is handled via class_enrollments table for data integrity

-- =============================================================================
-- TABLE: teachers
-- Policies: admin (all), teachers (own profile)
-- =============================================================================

ALTER TABLE IF EXISTS teachers ENABLE ROW LEVEL SECURITY;

-- Admin can read all teachers
CREATE POLICY "admin_read_all_teachers" ON teachers
  FOR SELECT
  USING (is_owner());

-- Admin can insert teachers
CREATE POLICY "admin_insert_teachers" ON teachers
  FOR INSERT
  WITH CHECK (is_owner());

-- Admin can update teachers
CREATE POLICY "admin_update_teachers" ON teachers
  FOR UPDATE
  USING (is_owner())
  WITH CHECK (is_owner());

-- Teachers can read their own profile
CREATE POLICY "teacher_read_own_profile" ON teachers
  FOR SELECT
  USING (
    is_owner()
    OR (user_id IS NOT NULL AND user_id = auth.uid())
  );

-- Teachers can update their own profile
CREATE POLICY "teacher_update_own_profile" ON teachers
  FOR UPDATE
  USING (
    is_owner()
    OR (user_id IS NOT NULL AND user_id = auth.uid())
  )
  WITH CHECK (
    is_owner()
    OR (user_id IS NOT NULL AND user_id = auth.uid())
  );

-- =============================================================================
-- TABLE: classes
-- Policies: admin (all), teachers (own classes), students (enrolled classes)
-- =============================================================================

ALTER TABLE IF EXISTS classes ENABLE ROW LEVEL SECURITY;

-- Admin can read all classes
CREATE POLICY "admin_read_all_classes" ON classes
  FOR SELECT
  USING (is_owner());

-- Admin can insert classes
CREATE POLICY "admin_insert_classes" ON classes
  FOR INSERT
  WITH CHECK (is_owner());

-- Admin can update classes
CREATE POLICY "admin_update_classes" ON classes
  FOR UPDATE
  USING (is_owner())
  WITH CHECK (is_owner());

-- Teachers can read their own classes
CREATE POLICY "teacher_read_own_classes" ON classes
  FOR SELECT
  USING (
    tenant_slug = 'peskids'
    AND (
      is_owner()
      OR (teacher_id IS NOT NULL AND teacher_id = auth.uid())
    )
  );

-- Teachers can update their own classes
CREATE POLICY "teacher_update_own_classes" ON classes
  FOR UPDATE
  USING (
    tenant_slug = 'peskids'
    AND (
      is_owner()
      OR (teacher_id IS NOT NULL AND teacher_id = auth.uid())
    )
  )
  WITH CHECK (
    tenant_slug = 'peskids'
    AND (
      is_owner()
      OR (teacher_id IS NOT NULL AND teacher_id = auth.uid())
    )
  );

-- =============================================================================
-- TABLE: feedback
-- Policies: admin (all), staff (all), teachers (class feedback), parents (own feedback)
-- =============================================================================

ALTER TABLE IF EXISTS feedback ENABLE ROW LEVEL SECURITY;

-- Admin can read all feedback
CREATE POLICY "admin_read_all_feedback" ON feedback
  FOR SELECT
  USING (is_owner());

-- Admin can insert feedback
CREATE POLICY "admin_insert_feedback" ON feedback
  FOR INSERT
  WITH CHECK (is_owner());

-- Admin can update feedback
CREATE POLICY "admin_update_feedback" ON feedback
  FOR UPDATE
  USING (is_owner())
  WITH CHECK (is_owner());

-- Staff can read all feedback (access from dashboard)
CREATE POLICY "staff_read_all_feedback" ON feedback
  FOR SELECT
  USING (
    tenant_slug = 'peskids'
    AND (is_owner() OR EXISTS (
      SELECT 1 FROM leads WHERE created_by = auth.uid() LIMIT 1
    ))
  );

-- Teachers can read feedback on their classes
CREATE POLICY "teacher_read_class_feedback" ON feedback
  FOR SELECT
  USING (
    tenant_slug = 'peskids'
    AND (
      is_owner()
      OR (
        subject_type = 'class'
        AND subject_ref_id IN (
          SELECT id FROM classes WHERE teacher_id = auth.uid()
        )
      )
    )
  );

-- Parents can read feedback they submitted
CREATE POLICY "parent_read_own_feedback" ON feedback
  FOR SELECT
  USING (
    tenant_slug = 'peskids'
    AND (
      is_owner()
      OR (
        author_type = 'parent'
        AND author_ref_id = auth.uid()
      )
    )
  );

-- Parents can insert feedback
CREATE POLICY "parent_insert_feedback" ON feedback
  FOR INSERT
  WITH CHECK (
    tenant_slug = 'peskids'
    AND (
      is_owner()
      OR (
        author_type = 'parent'
        AND author_ref_id = auth.uid()
      )
    )
  );

-- =============================================================================
-- TABLE: followups
-- Policies: admin (all), staff (all), assigned_to (own), related owner
-- =============================================================================

ALTER TABLE IF EXISTS followups ENABLE ROW LEVEL SECURITY;

-- Admin can read all followups
CREATE POLICY "admin_read_all_followups" ON followups
  FOR SELECT
  USING (is_owner());

-- Admin can insert followups
CREATE POLICY "admin_insert_followups" ON followups
  FOR INSERT
  WITH CHECK (is_owner());

-- Admin can update followups
CREATE POLICY "admin_update_followups" ON followups
  FOR UPDATE
  USING (is_owner())
  WITH CHECK (is_owner());

-- Staff can read all followups (operations dashboard)
CREATE POLICY "staff_read_all_followups" ON followups
  FOR SELECT
  USING (
    tenant_slug = 'peskids'
    AND (is_owner() OR EXISTS (
      SELECT 1 FROM leads WHERE created_by = auth.uid() LIMIT 1
    ))
  );

-- Assigned users can read their followups
CREATE POLICY "user_read_assigned_followups" ON followups
  FOR SELECT
  USING (
    tenant_slug = 'peskids'
    AND (
      is_owner()
      OR assigned_to = auth.email()
      OR assigned_to = auth.uid()::text
    )
  );

-- =============================================================================
-- TABLE: messages
-- Policies: admin (all), related author/recipient (own), staff (all)
-- =============================================================================

ALTER TABLE IF EXISTS messages ENABLE ROW LEVEL SECURITY;

-- Admin can read all messages
CREATE POLICY "admin_read_all_messages" ON messages
  FOR SELECT
  USING (is_owner());

-- Admin can insert messages
CREATE POLICY "admin_insert_messages" ON messages
  FOR INSERT
  WITH CHECK (is_owner());

-- Admin can update messages
CREATE POLICY "admin_update_messages" ON messages
  FOR UPDATE
  USING (is_owner())
  WITH CHECK (is_owner());

-- Staff can read all messages
CREATE POLICY "staff_read_all_messages" ON messages
  FOR SELECT
  USING (
    tenant_slug = 'peskids'
    AND (is_owner() OR EXISTS (
      SELECT 1 FROM leads WHERE created_by = auth.uid() LIMIT 1
    ))
  );

-- =============================================================================
-- VALIDATION QUERIES (after applying policies)
-- =============================================================================

-- Test as admin (owner):
-- SELECT COUNT(*) as total_leads FROM leads WHERE tenant_slug = 'peskids';
-- Expected: all leads
--
-- SELECT COUNT(*) as total_students FROM students;
-- Expected: all students
--
-- SELECT COUNT(*) as total_classes FROM classes;
-- Expected: all classes

-- Test as specific teacher (if linked to auth.uid()):
-- SET ROLE teacher_user;
-- SELECT COUNT(*) as my_classes FROM classes WHERE teacher_id = auth.uid();
-- Expected: only their classes

-- Test as specific parent (if linked to auth.uid()):
-- SET ROLE parent_user;
-- SELECT COUNT(*) as my_children FROM students WHERE parent_id = auth.uid();
-- Expected: only their children

-- =============================================================================
-- NOTES & TROUBLESHOOTING
-- =============================================================================

-- If policies fail to create:
-- 1. Check that tables exist: SELECT * FROM information_schema.tables WHERE table_schema = 'public'
-- 2. Check for duplicate policies: SELECT schemaname, tablename, policyname FROM pg_policies
-- 3. Drop conflicting policy: DROP POLICY "policy_name" ON table_name;
-- 4. Re-apply this file

-- If users see "new row violates row-level security policy":
-- 1. Verify auth.uid() or auth.email() is being set correctly
-- 2. Check that user columns (created_by, user_id, parent_id, teacher_id) are populated
-- 3. Add RAISE NOTICE to policy for debugging:
--    RAISE NOTICE 'Auth UID: %, Auth Email: %, created_by: %', auth.uid(), auth.email(), created_by;

-- If service_role operations are blocked:
-- 1. Service role should NOT be blocked by policies
-- 2. If blocked, check that SECURITY DEFINER functions are correct
-- 3. Verify no "FOR ALL" policies on the table
