import { supabaseServer } from '@/lib/supabase';
import type { OperationsMetrics } from '@/lib/class-types';

function tenantSlug(): string {
  return (process.env.NEXT_PUBLIC_TENANT_ID || 'peskids').trim().toLowerCase();
}

function peskidsClient() {
  return supabaseServer().schema('peskids');
}

function isMissingOperationsTables(error: { message?: string } | null): boolean {
  const message = error?.message?.toLowerCase() ?? '';
  return (
    message.includes('peskids.classes') ||
    message.includes('peskids.payments') ||
    message.includes('schema cache') ||
    message.includes('does not exist')
  );
}

export async function fetchOperationsMetrics(): Promise<OperationsMetrics> {
  const empty: OperationsMetrics = {
    classes_today: 0,
    enrollments_today: 0,
    attendance_rate_pct: null,
    revenue_month_cents: 0,
    revenue_month_by_provider: { stripe_cents: 0, wompi_cents: 0 },
    pending_payments_cents: 0,
  };

  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  try {
    const { count: classesToday, error: classesError } = await peskidsClient()
      .from('classes')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_slug', tenantSlug())
      .eq('status', 'scheduled')
      .gte('starts_at', startOfDay.toISOString())
      .lte('starts_at', endOfDay.toISOString());

    if (classesError) {
      if (isMissingOperationsTables(classesError)) return empty;
      throw classesError;
    }

    const { count: enrollmentsToday, error: enrollError } = await peskidsClient()
      .from('class_enrollments')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_slug', tenantSlug())
      .gte('joined_at', startOfDay.toISOString())
      .lte('joined_at', endOfDay.toISOString())
      .not('status', 'eq', 'cancelled');

    if (enrollError) {
      if (isMissingOperationsTables(enrollError)) return empty;
      throw enrollError;
    }

    const { data: attendedRows, error: attendedError } = await peskidsClient()
      .from('class_enrollments')
      .select('attendance')
      .eq('tenant_slug', tenantSlug())
      .not('attendance', 'is', null)
      .gte('joined_at', startOfMonth.toISOString());

    if (attendedError && !isMissingOperationsTables(attendedError)) {
      throw attendedError;
    }

    let attendance_rate_pct: number | null = null;
    if (attendedRows && attendedRows.length > 0) {
      const present = attendedRows.filter(
        (r) => r.attendance === 'present'
      ).length;
      attendance_rate_pct = Math.round((present / attendedRows.length) * 100);
    }

    const { data: paidPayments, error: paidError } = await peskidsClient()
      .from('payments')
      .select('amount_cents, provider')
      .eq('tenant_slug', tenantSlug())
      .eq('status', 'paid')
      .gte('paid_at', startOfMonth.toISOString());

    if (paidError && !isMissingOperationsTables(paidError)) {
      throw paidError;
    }

    const revenue_month_cents = (paidPayments ?? []).reduce(
      (sum, row) => sum + (row.amount_cents ?? 0),
      0
    );

    const revenue_month_by_provider = (paidPayments ?? []).reduce(
      (acc, row) => {
        const amount = row.amount_cents ?? 0;
        if (row.provider === 'wompi') {
          acc.wompi_cents += amount;
        } else {
          acc.stripe_cents += amount;
        }
        return acc;
      },
      { stripe_cents: 0, wompi_cents: 0 }
    );

    const { data: pendingPayments, error: pendingError } = await peskidsClient()
      .from('payments')
      .select('amount_cents')
      .eq('tenant_slug', tenantSlug())
      .eq('status', 'pending');

    if (pendingError && !isMissingOperationsTables(pendingError)) {
      throw pendingError;
    }

    const pending_payments_cents = (pendingPayments ?? []).reduce(
      (sum, row) => sum + (row.amount_cents ?? 0),
      0
    );

    return {
      classes_today: classesToday ?? 0,
      enrollments_today: enrollmentsToday ?? 0,
      attendance_rate_pct,
      revenue_month_cents,
      revenue_month_by_provider,
      pending_payments_cents,
    };
  } catch {
    return empty;
  }
}
