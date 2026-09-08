-- =============================================================================
-- Supabase compatibility shim for LOCAL, EPHEMERAL Postgres only.
-- =============================================================================
-- Purpose: recreate the minimum set of Supabase-managed objects (roles, the
-- `auth` schema and its JWT helper functions, `storage`) so that the Opsly
-- migration chain in `supabase/migrations/` can be replayed against a vanilla
-- Postgres instance for drift analysis and negative RLS testing.
--
-- THIS FILE MUST NEVER BE APPLIED TO A REAL SUPABASE PROJECT.
-- On a real project these objects are managed by GoTrue / Storage / the
-- Supabase platform, and re-defining them would be destructive.
--
-- The `auth.uid()` / `auth.role()` / `auth.jwt()` implementations below mirror
-- Supabase's real ones: they read `request.jwt.claims` (a JSON GUC set per
-- transaction/session), which is exactly how the platform passes the caller's
-- identity into RLS policies. This means RLS policies behave here the same way
-- they behave in production, which is what makes the negative tests meaningful.
-- =============================================================================

-- --- Roles -------------------------------------------------------------------
-- Supabase ships these three roles. `anon` and `authenticated` are NOT
-- BYPASSRLS; `service_role` IS (it is the "god mode" key). We reproduce that
-- exactly so the tests can prove that RLS actually holds for non-service roles.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN NOINHERIT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN NOINHERIT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN NOINHERIT BYPASSRLS;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticator') THEN
    CREATE ROLE authenticator LOGIN NOINHERIT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_admin') THEN
    CREATE ROLE supabase_admin LOGIN SUPERUSER;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_auth_admin') THEN
    CREATE ROLE supabase_auth_admin LOGIN NOINHERIT CREATEROLE;
  END IF;
END
$$;

GRANT anon, authenticated, service_role TO authenticator;

-- --- Extensions --------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- --- auth schema -------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS auth;
GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;

-- Minimal stand-in for GoTrue's auth.users. Only the columns the Opsly
-- migrations actually reference (id, email) plus the ones FKs need.
CREATE TABLE IF NOT EXISTS auth.users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         text UNIQUE,
  raw_app_meta_data  jsonb NOT NULL DEFAULT '{}'::jsonb,
  raw_user_meta_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION auth.jwt()
RETURNS jsonb
LANGUAGE sql STABLE
AS $$
  SELECT COALESCE(
    NULLIF(current_setting('request.jwt.claims', true), '')::jsonb,
    '{}'::jsonb
  );
$$;

CREATE OR REPLACE FUNCTION auth.uid()
RETURNS uuid
LANGUAGE sql STABLE
AS $$
  SELECT NULLIF(
    COALESCE(
      NULLIF(current_setting('request.jwt.claim.sub', true), ''),
      (NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
    ),
    ''
  )::uuid;
$$;

CREATE OR REPLACE FUNCTION auth.role()
RETURNS text
LANGUAGE sql STABLE
AS $$
  SELECT COALESCE(
    NULLIF(current_setting('request.jwt.claim.role', true), ''),
    (NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role'),
    current_setting('role', true)
  )::text;
$$;

CREATE OR REPLACE FUNCTION auth.email()
RETURNS text
LANGUAGE sql STABLE
AS $$
  SELECT COALESCE(
    NULLIF(current_setting('request.jwt.claim.email', true), ''),
    (NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'email')
  )::text;
$$;

GRANT EXECUTE ON FUNCTION auth.jwt(), auth.uid(), auth.role(), auth.email()
  TO anon, authenticated, service_role;

-- --- storage schema ----------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS storage;
GRANT USAGE ON SCHEMA storage TO anon, authenticated, service_role;

CREATE TABLE IF NOT EXISTS storage.buckets (
  id                 text PRIMARY KEY,
  name               text NOT NULL,
  owner              uuid,
  public             boolean DEFAULT false,
  file_size_limit    bigint,
  allowed_mime_types text[],
  created_at         timestamptz DEFAULT now(),
  updated_at         timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS storage.objects (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_id     text REFERENCES storage.buckets(id),
  name          text,
  owner         uuid,
  metadata      jsonb,
  path_tokens   text[] GENERATED ALWAYS AS (string_to_array(name, '/')) STORED,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;

-- --- default privileges Supabase applies to `public` -------------------------
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
