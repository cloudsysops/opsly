-- Peskids admin students CRUD: optional contact fields for Familias panel
-- Mirrors apps/peskids/migrations/20260623_add_student_admin_fields.sql

ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS parent_phone TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT;
