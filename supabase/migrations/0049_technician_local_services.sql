-- Technician / field-service extensions for Local Services (ls_*)
-- Aligns with apps/api local-services booking flow (tenant_slug keyed).

ALTER TABLE platform.ls_services ADD COLUMN IF NOT EXISTS external_key text;
ALTER TABLE platform.ls_services ADD COLUMN IF NOT EXISTS duration_minutes integer;
ALTER TABLE platform.ls_services ADD COLUMN IF NOT EXISTS price_cents integer;

CREATE UNIQUE INDEX IF NOT EXISTS idx_ls_services_tenant_external_key_unique
  ON platform.ls_services (tenant_slug, external_key)
  WHERE external_key IS NOT NULL;

ALTER TABLE platform.ls_bookings ADD COLUMN IF NOT EXISTS service_location text;
ALTER TABLE platform.ls_bookings ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE platform.ls_bookings ADD COLUMN IF NOT EXISTS latitude numeric;
ALTER TABLE platform.ls_bookings ADD COLUMN IF NOT EXISTS longitude numeric;
ALTER TABLE platform.ls_bookings ADD COLUMN IF NOT EXISTS estimated_travel_time_minutes integer;
ALTER TABLE platform.ls_bookings ADD COLUMN IF NOT EXISTS photos_after_service text[];
ALTER TABLE platform.ls_bookings ADD COLUMN IF NOT EXISTS equipment_needed text[];
ALTER TABLE platform.ls_bookings ADD COLUMN IF NOT EXISTS completed_at timestamptz;

CREATE TABLE IF NOT EXISTS platform.ls_technician_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_slug text NOT NULL REFERENCES platform.tenants (slug) ON DELETE CASCADE,
  day_of_week integer NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  is_available boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ls_technician_schedules_tenant_day_unique UNIQUE (tenant_slug, day_of_week)
);

CREATE INDEX IF NOT EXISTS idx_ls_technician_schedules_tenant
  ON platform.ls_technician_schedules (tenant_slug);

CREATE INDEX IF NOT EXISTS idx_ls_technician_schedules_day
  ON platform.ls_technician_schedules (day_of_week);

CREATE TABLE IF NOT EXISTS platform.ls_technician_service_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES platform.ls_bookings (id) ON DELETE CASCADE,
  tenant_slug text NOT NULL REFERENCES platform.tenants (slug) ON DELETE CASCADE,
  findings text,
  actions_taken text,
  metrics_before jsonb,
  metrics_after jsonb,
  recommendations text,
  before_photos text[],
  after_photos text[],
  equipment_used text[],
  time_spent_minutes integer,
  travel_distance_miles numeric,
  customer_satisfaction integer CHECK (
    customer_satisfaction IS NULL
    OR (customer_satisfaction >= 1 AND customer_satisfaction <= 5)
  ),
  upsell_offered text,
  next_maintenance_date date,
  pdf_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ls_technician_service_reports_booking
  ON platform.ls_technician_service_reports (booking_id);

CREATE INDEX IF NOT EXISTS idx_ls_technician_service_reports_tenant
  ON platform.ls_technician_service_reports (tenant_slug);

CREATE INDEX IF NOT EXISTS idx_ls_bookings_tenant_geo
  ON platform.ls_bookings (tenant_slug)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

ALTER TABLE platform.ls_technician_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform.ls_technician_service_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all_ls_technician_schedules"
  ON platform.ls_technician_schedules FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_ls_technician_service_reports"
  ON platform.ls_technician_service_reports FOR ALL TO service_role USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON platform.ls_technician_schedules TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON platform.ls_technician_service_reports TO service_role;
