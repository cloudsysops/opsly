import type { ReactElement } from 'react';
import Link from 'next/link';
import { PortalShell } from '@/components/layout/portal-shell';
import { DashboardShell } from '@/components/dashboard/premium-dashboard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CreateInvoiceForm } from './create-invoice-form';

export default async function NewInvoicePage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}): Promise<ReactElement> {
  const { tenant } = await params;

  return (
    <PortalShell title="Nueva Factura" showModeLink>
      <DashboardShell>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/dashboard/${tenant}/invoices`}>← Facturas</Link>
          </Button>
          <h1 className="font-sans text-xl font-semibold text-neutral-100">Nueva Factura</h1>
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Crear factura</CardTitle>
          </CardHeader>
          <CardContent>
            <CreateInvoiceForm tenant={tenant} />
          </CardContent>
        </Card>
      </DashboardShell>
    </PortalShell>
  );
}
