-- Peskids Phase 2 Week 1: Row Level Security Policies
-- Tables: leads, parents, students, classes, feedback, followups, messages
-- Roles: admin (sierrasantiago90@gmail.com), staff, teachers, parents, service_role
-- Idempotent: uses DO/EXCEPTION blocks to skip existing policies

BEGIN;

-- Helper function: identifies the Peskids owner by email
CREATE OR REPLACE FUNCTION is_owner()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN auth.email() = 'sierrasantiago90@gmail.com';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- TABLE: leads
-- ============================================================================

ALTER TABLE IF EXISTS public.leads ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "admin_read_all_leads" ON public.leads FOR SELECT USING (is_owner());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "admin_insert_leads" ON public.leads FOR INSERT WITH CHECK (is_owner());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "admin_update_leads" ON public.leads FOR UPDATE
    USING (is_owner()) WITH CHECK (is_owner());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "admin_delete_leads" ON public.leads FOR DELETE USING (is_owner());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "staff_read_own_leads" ON public.leads FOR SELECT
    USING (
      tenant_id = 'peskids'
      AND (is_owner() OR (created_by IS NOT NULL AND created_by = auth.uid()))
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "staff_update_own_leads" ON public.leads FOR UPDATE
    USING (tenant_id = 'peskids' AND (is_owner() OR (created_by IS NOT NULL AND created_by = auth.uid())))
    WITH CHECK (tenant_id = 'peskids' AND (is_owner() OR (created_by IS NOT NULL AND created_by = auth.uid())));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Anonymous lead submission (landing page form)
DO $$ BEGIN
  CREATE POLICY "anon_insert_leads" ON public.leads FOR INSERT TO anon
    WITH CHECK (tenant_id = 'peskids');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================================
-- TABLE: students
-- ============================================================================

ALTER TABLE IF EXISTS public.students ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "admin_read_all_students" ON public.students FOR SELECT USING (is_owner());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "admin_insert_students" ON public.students FOR INSERT WITH CHECK (is_owner());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "admin_update_students" ON public.students FOR UPDATE
    USING (is_owner()) WITH CHECK (is_owner());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "parent_read_own_children" ON public.students FOR SELECT
    USING (is_owner() OR (parent_id IS NOT NULL AND parent_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "parent_update_own_children" ON public.students FOR UPDATE
    USING (is_owner() OR (parent_id IS NOT NULL AND parent_id = auth.uid()))
    WITH CHECK (is_owner() OR (parent_id IS NOT NULL AND parent_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================================
-- TABLE: feedback
-- ============================================================================

ALTER TABLE IF EXISTS public.feedback ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "admin_read_all_feedback" ON public.feedback FOR SELECT USING (is_owner());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "admin_insert_feedback" ON public.feedback FOR INSERT WITH CHECK (is_owner());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "admin_update_feedback" ON public.feedback FOR UPDATE
    USING (is_owner()) WITH CHECK (is_owner());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "teacher_read_class_feedback" ON public.feedback FOR SELECT
    USING (
      tenant_id = 'peskids'
      AND (is_owner() OR (
        author_type = 'teacher'
        OR (subject_type = 'class' AND subject_ref_id IN (
          SELECT id FROM public.classes WHERE teacher_id = auth.uid()
        ))
      ))
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "parent_read_own_feedback" ON public.feedback FOR SELECT
    USING (
      tenant_id = 'peskids'
      AND (is_owner() OR (author_type = 'parent' AND author_ref_id = auth.uid()))
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "parent_insert_feedback" ON public.feedback FOR INSERT
    WITH CHECK (
      tenant_id = 'peskids'
      AND (is_owner() OR (author_type = 'parent' AND author_ref_id = auth.uid()))
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Anonymous feedback submission (landing page form)
DO $$ BEGIN
  CREATE POLICY "anon_insert_feedback" ON public.feedback FOR INSERT TO anon
    WITH CHECK (tenant_id = 'peskids');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================================
-- TABLE: followups
-- ============================================================================

ALTER TABLE IF EXISTS public.followups ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "admin_read_all_followups" ON public.followups FOR SELECT USING (is_owner());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "admin_insert_followups" ON public.followups FOR INSERT WITH CHECK (is_owner());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "admin_update_followups" ON public.followups FOR UPDATE
    USING (is_owner()) WITH CHECK (is_owner());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "user_read_assigned_followups" ON public.followups FOR SELECT
    USING (
      tenant_id = 'peskids'
      AND (is_owner() OR assigned_to = auth.email() OR assigned_to = auth.uid()::text)
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================================
-- TABLE: messages
-- ============================================================================

ALTER TABLE IF EXISTS public.messages ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "admin_read_all_messages" ON public.messages FOR SELECT USING (is_owner());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "admin_insert_messages" ON public.messages FOR INSERT WITH CHECK (is_owner());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "admin_update_messages" ON public.messages FOR UPDATE
    USING (is_owner()) WITH CHECK (is_owner());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================================
-- TABLE: classes (if exists)
-- ============================================================================

DO $$ BEGIN
  ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "admin_read_all_classes" ON public.classes FOR SELECT USING (is_owner());
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "teacher_read_own_classes" ON public.classes FOR SELECT
    USING (
      tenant_id = 'peskids'
      AND (is_owner() OR (teacher_id IS NOT NULL AND teacher_id = auth.uid()))
    );
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "teacher_update_own_classes" ON public.classes FOR UPDATE
    USING (tenant_id = 'peskids' AND (is_owner() OR (teacher_id IS NOT NULL AND teacher_id = auth.uid())))
    WITH CHECK (tenant_id = 'peskids' AND (is_owner() OR (teacher_id IS NOT NULL AND teacher_id = auth.uid())));
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_table THEN NULL; END $$;

-- ============================================================================
-- Indexes for policy performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_leads_tenant_id ON public.leads(tenant_id);
CREATE INDEX IF NOT EXISTS idx_leads_created_by ON public.leads(created_by) WHERE created_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_feedback_author_ref ON public.feedback(author_ref_id) WHERE author_ref_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_messages_tenant ON public.messages(tenant_slug) WHERE tenant_slug IS NOT NULL;

COMMIT;
