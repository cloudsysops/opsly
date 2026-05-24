-- Migration: Add RLS Policies for Peskids Multi-User Tenant Isolation
-- Date: 2026-05-24
-- Owner: sierrasantiago90@gmail.com
-- Purpose: Enable multi-user support with role-based data access

-- ============================================================================
-- SETUP: Enable RLS on all Peskids tables
-- ============================================================================

ALTER TABLE IF EXISTS public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.followups ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.messages ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- ROLE 1: Owner (sierrasantiago90@gmail.com) — Read/Write All
-- ============================================================================

-- Admin bypasses all RLS policies
ALTER TABLE public.leads FORCE ROW LEVEL SECURITY;
CREATE POLICY "admin_read_all_leads" ON public.leads
  FOR SELECT TO authenticated
  USING (auth.jwt()->>'email' = 'sierrasantiago90@gmail.com');

CREATE POLICY "admin_write_all_leads" ON public.leads
  FOR INSERT TO authenticated
  WITH CHECK (auth.jwt()->>'email' = 'sierrasantiago90@gmail.com');

CREATE POLICY "admin_update_all_leads" ON public.leads
  FOR UPDATE TO authenticated
  USING (auth.jwt()->>'email' = 'sierrasantiago90@gmail.com')
  WITH CHECK (auth.jwt()->>'email' = 'sierrasantiago90@gmail.com');

CREATE POLICY "admin_delete_all_leads" ON public.leads
  FOR DELETE TO authenticated
  USING (auth.jwt()->>'email' = 'sierrasantiago90@gmail.com');

-- ============================================================================
-- ROLE 2: Staff — Read/Write Leads (created by self)
-- ============================================================================

CREATE POLICY "staff_read_own_leads" ON public.leads
  FOR SELECT TO authenticated
  USING (
    created_by = auth.uid()
    OR auth.jwt()->>'email' = 'sierrasantiago90@gmail.com'
  );

CREATE POLICY "staff_create_leads" ON public.leads
  FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND tenant_slug = 'peskids'
  );

CREATE POLICY "staff_update_own_leads" ON public.leads
  FOR UPDATE TO authenticated
  USING (
    created_by = auth.uid()
    OR auth.jwt()->>'email' = 'sierrasantiago90@gmail.com'
  );

-- ============================================================================
-- ROLE 3: Teachers — Read own classes + feedback
-- ============================================================================

CREATE POLICY "teacher_read_own_classes" ON public.classes
  FOR SELECT TO authenticated
  USING (
    teacher_id = auth.uid()
    OR auth.jwt()->>'email' = 'sierrasantiago90@gmail.com'
  );

CREATE POLICY "teacher_read_feedback_on_own_classes" ON public.feedback
  FOR SELECT TO authenticated
  USING (
    class_id IN (
      SELECT id FROM public.classes WHERE teacher_id = auth.uid()
    )
    OR auth.jwt()->>'email' = 'sierrasantiago90@gmail.com'
  );

CREATE POLICY "teacher_create_feedback" ON public.feedback
  FOR INSERT TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND class_id IN (SELECT id FROM public.classes WHERE teacher_id = auth.uid() OR teacher_id IS NULL)
  );

-- ============================================================================
-- ROLE 4: Parents — Read own children + own feedback
-- ============================================================================

CREATE POLICY "parent_read_own_children" ON public.students
  FOR SELECT TO authenticated
  USING (
    parent_id = auth.uid()
    OR auth.jwt()->>'email' = 'sierrasantiago90@gmail.com'
  );

CREATE POLICY "parent_read_own_feedback" ON public.feedback
  FOR SELECT TO authenticated
  USING (
    author_id = auth.uid()
    OR student_id IN (
      SELECT id FROM public.students WHERE parent_id = auth.uid()
    )
    OR auth.jwt()->>'email' = 'sierrasantiago90@gmail.com'
  );

CREATE POLICY "parent_create_feedback" ON public.feedback
  FOR INSERT TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND student_id IN (SELECT id FROM public.students WHERE parent_id = auth.uid())
  );

-- ============================================================================
-- Public/Service Role Access (for N8N webhooks)
-- ============================================================================

-- Allow service role (N8N) to insert leads without RLS restrictions
-- Service role will use SUPABASE_SERVICE_ROLE_KEY (bypasses RLS by design)

-- Allow anonymous webhook submission (temporary, remove after RLS tested)
CREATE POLICY "anonymous_submit_leads" ON public.leads
  FOR INSERT TO anon
  WITH CHECK (tenant_slug = 'peskids');

-- ============================================================================
-- Indexes for RLS Performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_leads_created_by ON public.leads(created_by);
CREATE INDEX IF NOT EXISTS idx_leads_tenant_slug ON public.leads(tenant_slug);
CREATE INDEX IF NOT EXISTS idx_students_parent_id ON public.students(parent_id);
CREATE INDEX IF NOT EXISTS idx_students_tenant_slug ON public.students(tenant_slug);
CREATE INDEX IF NOT EXISTS idx_classes_teacher_id ON public.classes(teacher_id);
CREATE INDEX IF NOT EXISTS idx_feedback_author_id ON public.feedback(author_id);
CREATE INDEX IF NOT EXISTS idx_feedback_class_id ON public.feedback(class_id);

-- ============================================================================
-- Verification
-- ============================================================================

-- Test queries to verify RLS:
-- As owner (sierrasantiago90@gmail.com):
--   SELECT COUNT(*) FROM leads;  -- Should return all leads
--
-- As staff member (different user_id):
--   SELECT COUNT(*) FROM leads;  -- Should return only leads created by self
--
-- As parent (viewing student):
--   SELECT * FROM students WHERE parent_id = auth.uid();  -- Should return own children only
