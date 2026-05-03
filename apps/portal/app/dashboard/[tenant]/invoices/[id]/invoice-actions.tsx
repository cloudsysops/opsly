'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { getApiBaseUrl } from '@/lib/api';
import { PORTAL_DEMO_COOKIE } from '@/lib/demo-tenant';

const NEXT_STATUS: Record<string, { label: string; status: string }[]> = {
  draft: [
    { label: 'Enviar', status: 'sent' },
    { label: 'Cancelar', status: 'cancelled' },
  ],
  sent: [
    { label: 'Marcar pagada', status: 'paid' },
    { label: 'Cancelar', status: 'cancelled' },
  ],
  overdue: [
    { label: 'Marcar pagada', status: 'paid' },
    { label: 'Anular', status: 'void' },
  ],
};

export function InvoiceStatusActions({
  invoiceId,
  currentStatus,
  tenant,
}: {
  invoiceId: string;
  currentStatus: string;
  tenant: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const actions = NEXT_STATUS[currentStatus];

  if (!actions || actions.length === 0) return null;

  async function updateStatus(newStatus: string) {
    setLoading(true);
    try {
      const hasDemoSession =
        document.cookie.includes(`${PORTAL_DEMO_COOKIE}=1`) &&
        (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
      if (hasDemoSession) {
        router.refresh();
        return;
      }
      const base = getApiBaseUrl();
      const res = await fetch(`${base}/api/billing/invoices/${invoiceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex gap-2">
      {actions.map((action) => (
        <Button
          key={action.status}
          variant={action.status === 'paid' ? 'primary' : 'default'}
          size="sm"
          disabled={loading}
          onClick={() => void updateStatus(action.status)}
        >
          {action.label}
        </Button>
      ))}
    </div>
  );
}
