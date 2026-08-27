'use client';

import { useEffect, useState } from 'react';
import { BarChart3, ClipboardList, Compass, FileText, LayoutGrid } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

type UnitRow = {
  id: string;
  code: string;
  name: string;
  type: string;
  status: string;
  franchiseeId: string | null;
  openingStatus: string | null;
};

type View = 'units' | 'territories' | 'agreements' | 'royalties' | 'audits';

const TABS: Array<{ id: View; label: string; icon: typeof LayoutGrid }> = [
  { id: 'units', label: 'Franquicias / Sedes', icon: LayoutGrid },
  { id: 'territories', label: 'Territorios', icon: Compass },
  { id: 'agreements', label: 'Contratos', icon: FileText },
  { id: 'royalties', label: 'Ventas → regalías', icon: BarChart3 },
  { id: 'audits', label: 'Auditorías', icon: ClipboardList },
];

export function FranchiseOsPanel(): React.ReactElement {
  const [view, setView] = useState<View>('units');
  const [units, setUnits] = useState<UnitRow[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async (): Promise<void> => {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/franchise-os?view=${view}`, { credentials: 'include' });
        const json = (await res.json()) as { units?: UnitRow[]; error?: string };
        if (!res.ok) throw new Error(json.error || 'No se pudo cargar Franchise OS');
        setUnits(json.units ?? []);
        setError('');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [view]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <Button
            key={tab.id}
            type="button"
            size="sm"
            variant={view === tab.id ? 'primary' : 'secondary'}
            onClick={() => setView(tab.id)}
          >
            <tab.icon className="mr-1 h-4 w-4" aria-hidden />
            {tab.label}
          </Button>
        ))}
      </div>

      {error ? <p className="text-sm text-amber-700">{error}</p> : null}

      {view === 'units' ? (
        <Card>
          <CardHeader>
            <CardTitle>Unidades del tenant Peskids</CardTitle>
            <CardDescription>
              Un solo tenant_slug. Llanogrande y Domicilios son unidades owned/flagship/mobile, no franquiciados.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-pk-sub">Cargando…</p>
            ) : (
              <ul className="divide-y divide-pk-border text-sm">
                {units.map((unit) => (
                  <li key={unit.id} className="flex flex-wrap items-baseline justify-between gap-2 py-3">
                    <div>
                      <p className="font-medium text-pk-ink">{unit.name}</p>
                      <p className="text-pk-sub">
                        {unit.code} · {unit.type} · {unit.status}
                        {unit.franchiseeId ? ` · franchisee ${unit.franchiseeId}` : ' · sin franchisee (operación propia)'}
                      </p>
                    </div>
                    <span className="text-xs text-pk-sub">{unit.openingStatus ?? 'activa'}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      ) : null}

      {view === 'territories' ? (
        <Card>
          <CardHeader>
            <CardTitle>Territorios</CardTitle>
            <CardDescription>
              Exclusividad sede vs domicilio puede coexistir en el mismo municipio. Mapas: adapter Mapbox/Google
              cuando haya credenciales — no hay keys en el cliente.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-pk-sub">
            Lista vacía hasta aplicar `0098_franchise_core`. El motor de conflictos exclusive/overlap vive en
            `@intcloudsysops/franchise-core`.
          </CardContent>
        </Card>
      ) : null}

      {view === 'agreements' ? (
        <Card>
          <CardHeader>
            <CardTitle>Contratos y vencimientos</CardTitle>
            <CardDescription>Alertas 180/90/60/30 días. La firma electrónica es un adapter, no el núcleo.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-pk-sub">
            Sin contratos persistidos todavía. El software no es la verdad legal: refleja el contrato firmado.
          </CardContent>
        </Card>
      ) : null}

      {view === 'royalties' ? (
        <Card>
          <CardHeader>
            <CardTitle>Ventas → regalías</CardTitle>
            <CardDescription>
              Cálculo versionado en basis points + snapshot inmutable. Cambiar la regla no reescribe historia.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-pk-sub">
            {error.includes('teacher') || error.includes('royalty')
              ? 'Esta vista está restringida. Los profesores no ven regalías.'
              : 'Inspecciona un cálculo con POST action=inspect_royalty. Persistencia: migración 0098.'}
          </CardContent>
        </Card>
      ) : null}

      {view === 'audits' ? (
        <Card>
          <CardHeader>
            <CardTitle>Auditorías y acciones correctivas</CardTitle>
            <CardDescription>Plantillas versionadas. Estándares de natación viven en el adapter, no en el core.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-pk-sub">
            Sin auditorías persistidas hasta 0098. Hallazgos y due dates se derivan en franchise-core.
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
