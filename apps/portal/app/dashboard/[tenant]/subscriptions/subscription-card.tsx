'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { getApiBaseUrl } from '@/lib/api';

interface Subscription {
  id: string;
  plan_id: string;
  status: string;
  billing_period: string;
  amount_cents: number;
  currency: string;
  current_period_start: string | null;
  current_period_end: string | null;
  auto_renew: boolean;
  created_at: string;
  cancelled_at: string | null;
}

interface BillingPlan {
  id: string;
  name: string;
  description: string | null;
  monthly_price_cents: number;
  yearly_price_cents: number;
  currency: string;
  features: Record<string, unknown>;
}

const STATUS_COLORS: Record<string, string> = {
  active: 'text-green-400 bg-green-900/30',
  past_due: 'text-yellow-400 bg-yellow-900/30',
  cancelled: 'text-neutral-500 bg-neutral-800/50',
  trialing: 'text-blue-400 bg-blue-900/30',
  paused: 'text-orange-400 bg-orange-900/30',
};

const CENTS_DIVISOR = 100;

function formatMoney(cents: number, currency: string): string {
  const amount = cents / CENTS_DIVISOR;
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function StatusBadge({ status }: { status: string }) {
  const colors = STATUS_COLORS[status] ?? 'text-neutral-400 bg-neutral-800';
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${colors}`}>
      {status}
    </span>
  );
}

export function SubscriptionCard({
  subscription,
  plans,
  tenant,
}: {
  subscription: Subscription;
  plans: BillingPlan[];
  tenant: string;
}) {
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cancelled, setCancelled] = useState(subscription.status === 'cancelled');

  const plan = plans.find((p) => p.id === subscription.plan_id);

  async function handleCancel() {
    if (!confirm('Cancelar suscripcion? Se mantiene activa hasta fin del periodo.')) {
      return;
    }
    setCancelling(true);
    setError(null);
    try {
      const base = getApiBaseUrl();
      const res = await fetch(`${base}/api/billing/subscriptions?tenant_id=${tenant}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        setError(body.error ?? 'Error al cancelar');
        return;
      }
      setCancelled(true);
    } catch {
      setError('Error de conexion');
    } finally {
      setCancelling(false);
    }
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{plan?.name ?? subscription.plan_id}</CardTitle>
          <StatusBadge status={cancelled ? 'cancelled' : subscription.status} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-ops-gray">Monto</p>
            <p className="mt-1 font-mono text-lg text-neutral-100">
              {formatMoney(subscription.amount_cents, subscription.currency)}
            </p>
            <p className="text-xs text-ops-gray">
              / {subscription.billing_period === 'yearly' ? 'anual' : 'mensual'}
            </p>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wider text-ops-gray">Periodo actual</p>
            <p className="mt-1 text-sm text-neutral-200">
              {subscription.current_period_start ?? '—'} → {subscription.current_period_end ?? '—'}
            </p>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wider text-ops-gray">Auto-renovacion</p>
            <p className="mt-1 text-sm text-neutral-200">{subscription.auto_renew ? 'Si' : 'No'}</p>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wider text-ops-gray">Desde</p>
            <p className="mt-1 text-sm text-neutral-200">{subscription.created_at.slice(0, 10)}</p>
          </div>
        </div>

        {plan?.description ? (
          <p className="mt-4 text-sm text-ops-gray">{plan.description}</p>
        ) : null}

        {error ? <p className="mt-4 text-sm text-red-400">{error}</p> : null}

        {!cancelled && subscription.status === 'active' ? (
          <div className="mt-6 flex justify-end">
            <Button variant="ghost" size="sm" onClick={handleCancel} disabled={cancelling}>
              {cancelling ? 'Cancelando...' : 'Cancelar suscripcion'}
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
