-- Agregaciones para Super Admin (solo service_role vía API con SUPABASE_SERVICE_ROLE_KEY)
CREATE OR REPLACE FUNCTION public.opsly_admin_metrics(p_month_start timestamptz)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = platform, public
STABLE
AS $$
  SELECT jsonb_build_object(
    'active_tenants',
    (SELECT COUNT(*)::int FROM platform.tenants WHERE status = 'active' AND deleted_at IS NULL),
    'gross_revenue_month',
    COALESCE(
      (
        SELECT SUM(bu.total_amount)
        FROM platform.billing_usage bu
        WHERE bu.recorded_at >= p_month_start
          AND bu.recorded_at < p_month_start + interval '1 month'
      ),
      0
    )::numeric
  );
$$;

CREATE OR REPLACE FUNCTION public.opsly_admin_tenants_page(p_limit int, p_offset int)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = platform, public
STABLE
AS $$
  SELECT jsonb_build_object(
    'total',
    (SELECT COUNT(*)::int FROM platform.tenants WHERE deleted_at IS NULL),
    'items',
    COALESCE(
      (
        SELECT jsonb_agg(row_data ORDER BY ord)
        FROM (
          SELECT
            jsonb_build_object(
              'id',
              t.id,
              'slug',
              t.slug,
              'name',
              t.name,
              'owner_email',
              t.owner_email,
              'plan',
              t.plan,
              'status',
              t.status,
              'spend_month_usd',
              COALESCE(spend.sum_amt, 0)
            ) AS row_data,
            t.created_at AS ord
          FROM platform.tenants t
          LEFT JOIN LATERAL (
            SELECT SUM(bu.total_amount) AS sum_amt
            FROM platform.billing_usage bu
            WHERE bu.tenant_id = t.id
              AND bu.recorded_at >= date_trunc('month', now() AT TIME ZONE 'utc')
              AND bu.recorded_at < date_trunc('month', now() AT TIME ZONE 'utc') + interval '1 month'
          ) spend ON true
          WHERE t.deleted_at IS NULL
          ORDER BY t.created_at DESC
          LIMIT p_limit
          OFFSET p_offset
        ) sub
      ),
      '[]'::jsonb
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.opsly_admin_revenue_by_month(p_months int DEFAULT 6)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = platform, public
STABLE
AS $$
  WITH bounds AS (
    SELECT GREATEST(1, LEAST(COALESCE(p_months, 6), 24))::int AS n
  ),
  months AS (
    SELECT
      date_trunc('month', (now() AT TIME ZONE 'utc')) - ((gs || ' months')::interval) AS start_ts,
      to_char(
        date_trunc('month', (now() AT TIME ZONE 'utc')) - ((gs || ' months')::interval),
        'YYYY-MM'
      ) AS label
    FROM bounds,
      generate_series(0, (SELECT n - 1 FROM bounds)) AS gs
  )
  SELECT COALESCE(
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'month',
          m.label,
          'amount',
          COALESCE(agg.sum_amt, 0)
        )
        ORDER BY m.start_ts ASC
      )
      FROM months m
      LEFT JOIN LATERAL (
        SELECT SUM(bu.total_amount) AS sum_amt
        FROM platform.billing_usage bu
        WHERE bu.recorded_at >= m.start_ts
          AND bu.recorded_at < m.start_ts + interval '1 month'
      ) agg ON true
    ),
    '[]'::jsonb
  );
$$;

REVOKE ALL ON FUNCTION public.opsly_admin_metrics(timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.opsly_admin_tenants_page(int, int) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.opsly_admin_revenue_by_month(int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.opsly_admin_metrics(timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.opsly_admin_tenants_page(int, int) TO service_role;
GRANT EXECUTE ON FUNCTION public.opsly_admin_revenue_by_month(int) TO service_role;
