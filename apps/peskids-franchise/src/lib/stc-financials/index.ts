import { Pool } from 'pg';

// Lazy-loaded connection pools for Westside and Eastside
let westsidePool: Pool | null = null;
let eastsidePool: Pool | null = null;

function getWestsidePool(): Pool | null {
  if (!westsidePool && process.env.STC_WESTSIDE_DATABASE_URL) {
    westsidePool = new Pool({
      connectionString: process.env.STC_WESTSIDE_DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 5,
    });
  }
  return westsidePool;
}

function getEastsidePool(): Pool | null {
  if (!eastsidePool && process.env.STC_EASTSIDE_DATABASE_URL) {
    eastsidePool = new Pool({
      connectionString: process.env.STC_EASTSIDE_DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 5,
    });
  }
  return eastsidePool;
}

export interface LocationFinancials {
  location: string;
  year: number;
  month: number;
  lessons: number;
  hours: number;
  students: number;
  revenue: number;
  tutorPay: number;
  adHocPay: number;
  totalCogs: number;
  grossProfit: number;
  grossMarginPercent: number;
  // Revenue breakdown by category
  homeRevenue: number;
  onlineRevenue: number;
  retailRevenue: number;
  schoolRevenue: number;
  otherRevenue: number;
}

// Get the pool for a specific location
function getPool(location: 'westside' | 'eastside'): Pool | null {
  if (location === 'westside') {
    return getWestsidePool();
  } else if (location === 'eastside') {
    return getEastsidePool();
  }
  return null;
}

// Calculate monthly financials for a specific location
export async function getLocationMonthlyFinancials(
  location: 'westside' | 'eastside',
  year: number,
  month: number
): Promise<LocationFinancials | null> {
  const pool = getPool(location);
  if (!pool) {
    console.warn(`[STC Financials] No database connection for ${location}`);
    return null;
  }

  // Calculate date range for the month
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 1);

  const startStr = startDate.toISOString().split('T')[0];
  const endStr = endDate.toISOString().split('T')[0];

  try {
    // Query for lessons, hours, students, and revenue
    // Note: s.labels is JSONB so we cast to text for ILIKE comparisons
    const revenueQuery = `
      WITH appointment_data AS (
        SELECT
          a.appointment_id,
          a.units,
          CASE
            WHEN s.labels::text ILIKE '%Home%' THEN 'home'
            WHEN s.labels::text ILIKE '%Online%' THEN 'online'
            WHEN s.labels::text ILIKE '%Club%' OR s.labels::text ILIKE '%Park Slope%' OR s.labels::text ILIKE '%UES%' THEN 'retail'
            WHEN s.labels::text ILIKE '%School%' THEN 'schools'
            ELSE 'other'
          END as category,
          CASE
            WHEN s.dft_charge_type IN ('hourly', 'hourly-split') THEN ar.charge_rate * a.units
            ELSE ar.charge_rate
          END as charge_amount,
          ar.recipient_id
        FROM appointments a
        JOIN services s ON a.service_id = s.service_id
        LEFT JOIN appointment_recipients ar ON a.appointment_id = ar.appointment_id
          AND ar.status <> 'missed'
        WHERE a.status IN ('complete', 'completed', 'cancelled-chargeable')
          AND (a.is_deleted IS NULL OR a.is_deleted = false)
          AND a.start >= $1::timestamp AND a.start < $2::timestamp
      )
      SELECT
        COUNT(DISTINCT appointment_id) as lessons,
        COALESCE(SUM(units), 0) as total_hours,
        COUNT(DISTINCT recipient_id) as students,
        COALESCE(SUM(charge_amount), 0) as total_revenue,
        COALESCE(SUM(CASE WHEN category = 'home' THEN charge_amount ELSE 0 END), 0) as home_revenue,
        COALESCE(SUM(CASE WHEN category = 'online' THEN charge_amount ELSE 0 END), 0) as online_revenue,
        COALESCE(SUM(CASE WHEN category = 'retail' THEN charge_amount ELSE 0 END), 0) as retail_revenue,
        COALESCE(SUM(CASE WHEN category = 'schools' THEN charge_amount ELSE 0 END), 0) as school_revenue,
        COALESCE(SUM(CASE WHEN category = 'other' THEN charge_amount ELSE 0 END), 0) as other_revenue
      FROM appointment_data
    `;

    // Query for tutor pay (COGS)
    const cogsQuery = `
      SELECT
        COALESCE(SUM(
          CASE
            WHEN s.dft_charge_type IN ('hourly', 'hourly-split') THEN ac.pay_rate * a.units
            ELSE ac.pay_rate
          END
        ), 0) as tutor_pay
      FROM appointments a
      JOIN services s ON a.service_id = s.service_id
      LEFT JOIN appointment_contractors ac ON a.appointment_id = ac.appointment_id
      WHERE a.status IN ('complete', 'completed', 'cancelled-chargeable')
        AND (a.is_deleted IS NULL OR a.is_deleted = false)
        AND a.start >= $1::timestamp AND a.start < $2::timestamp
    `;

    // Query for ad hoc charges
    const adHocQuery = `
      SELECT COALESCE(SUM(pay_contractor), 0) as adhoc_pay
      FROM adhoc_charges
      WHERE date_occurred >= $1::date AND date_occurred < $2::date
    `;

    const [revenueResult, cogsResult, adHocResult] = await Promise.all([
      pool.query(revenueQuery, [startStr, endStr]),
      pool.query(cogsQuery, [startStr, endStr]),
      pool.query(adHocQuery, [startStr, endStr]),
    ]);

    const revenue = revenueResult.rows[0];
    const cogs = cogsResult.rows[0];
    const adHoc = adHocResult.rows[0];

    const totalRevenue = parseFloat(revenue.total_revenue) || 0;
    const tutorPay = parseFloat(cogs.tutor_pay) || 0;
    const adHocPay = parseFloat(adHoc.adhoc_pay) || 0;
    const totalCogs = tutorPay + adHocPay;
    const grossProfit = totalRevenue - totalCogs;
    const grossMarginPercent = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

    return {
      location,
      year,
      month,
      lessons: parseInt(revenue.lessons) || 0,
      hours: parseFloat(revenue.total_hours) || 0,
      students: parseInt(revenue.students) || 0,
      revenue: totalRevenue,
      tutorPay,
      adHocPay,
      totalCogs,
      grossProfit,
      grossMarginPercent,
      homeRevenue: parseFloat(revenue.home_revenue) || 0,
      onlineRevenue: parseFloat(revenue.online_revenue) || 0,
      retailRevenue: parseFloat(revenue.retail_revenue) || 0,
      schoolRevenue: parseFloat(revenue.school_revenue) || 0,
      otherRevenue: parseFloat(revenue.other_revenue) || 0,
    };
  } catch (error) {
    console.error(`[STC Financials] Error querying ${location}:`, error);
    return null;
  }
}

// Get financials for all franchise locations
export async function getAllFranchiseeFinancials(
  year: number,
  month: number
): Promise<{ westside: LocationFinancials | null; eastside: LocationFinancials | null }> {
  const [westside, eastside] = await Promise.all([
    getLocationMonthlyFinancials('westside', year, month),
    getLocationMonthlyFinancials('eastside', year, month),
  ]);

  return { westside, eastside };
}

// Map location name to franchisee identifier
export function getLocationIdentifier(location: string): 'westside' | 'eastside' | null {
  const normalized = location.toLowerCase().trim();
  if (normalized.includes('westside')) return 'westside';
  if (normalized.includes('eastside')) return 'eastside';
  return null;
}

// Check if STC database connections are configured
export function isSTCDatabaseConfigured(): boolean {
  return !!(process.env.STC_WESTSIDE_DATABASE_URL || process.env.STC_EASTSIDE_DATABASE_URL);
}
