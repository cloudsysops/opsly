'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { getApiBaseUrl } from '@/lib/api';
import { useRouter } from 'next/navigation';

interface BillingPlan {
  id: string;
  name: string;
  description: string | null;
  monthly_price_cents: number;
  yearly_price_cents: number;
  currency: string;
  features: Record<string, unknown>;
}

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

export function PlanSelector({
  plans,
  tenant,
  tenantId,
}: {
  plans: BillingPlan[];
  tenant: string;
  tenantId: string;
}) {
  const router = useRouter();
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<'monthly' | 'yearly'>('monthly');

  async function handleSubscribe(planId: string) {
    setSubscribing(planId);
    setError(null);
    try {
      const base = getApiBaseUrl();
      const res = await fetch(`${base}/api/billing/subscriptions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: tenantId,
          plan_id: planId,
          billing_period: period,
        }),
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        setError(body.error ?? 'Error al suscribir');
        return;
      }
      router.refresh();
    } catch {
      setError('Error de conexion');
    } finally {
      setSubscribing(null);
    }
  }

  if (plans.length === 0) {
    return (
      <p className="text-sm text-ops-gray">
        No hay planes disponibles en este momento.
      </p>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <button
          type="button"
          onClick={() => setPeriod('monthly')}
          className={`rounded-md px-3 py-1 text-sm transition-colors ${
            period === 'monthly'
              ? 'bg-ops-green/15 text-ops-green'
              : 'text-ops-gray hover:text-neutral-200'
          }`}
        >
          Mensual
        </button>
        <button
          type="button"
          onClick={() => setPeriod('yearly')}
          className={`rounded-md px-3 py-1 text-sm transition-colors ${
            period === 'yearly'
              ? 'bg-ops-green/15 text-ops-green'
              : 'text-ops-gray hover:text-neutral-200'
          }`}
        >
          Anual
        </button>
      </div>

      {error ? (
        <p className="mb-4 text-sm text-red-400">{error}</p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan) => {
          const price =
            period === 'yearly'
              ? plan.yearly_price_cents
              : plan.monthly_price_cents;

          return (
            <Card key={plan.id} variant="elevated">
              <CardHeader>
                <CardTitle>{plan.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-mono text-2xl text-neutral-100">
                  {formatMoney(price, plan.currency)}
                </p>
                <p className="text-xs text-ops-gray">
                  / {period === 'yearly' ? 'ano' : 'mes'}
                </p>
                {plan.description ? (
                  <p className="mt-3 text-sm text-ops-gray">
                    {plan.description}
                  </p>
                ) : null}
                <Button
                  variant="primary"
                  size="sm"
                  className="mt-4 w-full"
                  onClick={() => handleSubscribe(plan.id)}
                  disabled={subscribing !== null}
                >
                  {subscribing === plan.id ? 'Suscribiendo...' : 'Suscribirse'}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
