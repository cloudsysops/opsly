'use client';

import { FormEvent, useEffect, useState } from 'react';
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

type TerritoryRow = { id: string; name: string; exclusive: boolean; unitId: string | null };
type AgreementBoardRow = {
  derivedStatus: string;
  alerts: Array<{ thresholdDays: number; daysUntilExpiry: number }>;
  agreement: { id: string; expirationDate: string; franchiseeId: string };
};
type CalcRow = { id: string; royaltyDue: number; ruleVersion: number; calculatedAt: string; unitId: string };
type AuditRow = { id: string; unitId: string; status: string; auditor: string };
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
  const [territories, setTerritories] = useState<TerritoryRow[]>([]);
  const [board, setBoard] = useState<AgreementBoardRow[]>([]);
  const [calculations, setCalculations] = useState<CalcRow[]>([]);
  const [audits, setAudits] = useState<AuditRow[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');

  async function load(): Promise<void> {
    setLoading(true);
    try {
      const [viewRes, unitsRes] = await Promise.all([
        fetch(`/api/admin/franchise-os?view=${view}`, { credentials: 'include' }),
        fetch('/api/admin/franchise-os?view=units', { credentials: 'include' }),
      ]);
      const json = (await viewRes.json()) as {
        territories?: TerritoryRow[];
        board?: AgreementBoardRow[];
        calculations?: CalcRow[];
        audits?: AuditRow[];
        error?: string;
        code?: string;
      };
      const unitsJson = (await unitsRes.json()) as { units?: UnitRow[] };
      if (unitsRes.ok) setUnits(unitsJson.units ?? []);
      if (!viewRes.ok) {
        throw new Error(
          json.code === 'FRANCHISE_SCHEMA_NOT_AVAILABLE' ? json.code : json.error || 'No se pudo cargar Franchise OS'
        );
      }
      setTerritories(json.territories ?? []);
      setBoard(json.board ?? []);
      setCalculations(json.calculations ?? []);
      setAudits(json.audits ?? []);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [view]);

  async function postJson(path: string, body: Record<string, unknown>): Promise<void> {
    setNotice('');
    const res = await fetch(path, {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = (await res.json()) as { error?: string; code?: string };
    if (!res.ok) throw new Error(json.code || json.error || 'Error al guardar');
    setNotice('Guardado');
    await load();
  }

  const firstUnit = units[0]?.id ?? '';

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
      {notice ? <p className="text-sm text-pk-sub">{notice}</p> : null}

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
            <CardDescription>Persistido en 0098. Sin PostGIS: municipio / radio en metadata.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <ul className="divide-y divide-pk-border">
              {territories.map((row) => (
                <li key={row.id} className="py-2">
                  {row.name} {row.exclusive ? '· exclusivo' : ''} {row.unitId ? `· unit ${row.unitId.slice(0, 8)}` : ''}
                </li>
              ))}
            </ul>
            <TerritoryForm
              unitId={firstUnit}
              onSubmit={(body) => postJson('/api/admin/franchises/territories', body)}
            />
          </CardContent>
        </Card>
      ) : null}

      {view === 'agreements' ? (
        <Card>
          <CardHeader>
            <CardTitle>Contratos y vencimientos</CardTitle>
            <CardDescription>Alertas 180/90/60/30 días.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <ul className="divide-y divide-pk-border">
              {board.map((row) => (
                <li key={row.agreement.id} className="py-2">
                  {row.derivedStatus} · vence {row.agreement.expirationDate}
                  {row.alerts[0] ? ` · ventana ${row.alerts[0].thresholdDays}d` : ''}
                </li>
              ))}
            </ul>
            <AgreementForm
              unitId={firstUnit}
              onSubmit={(body) => postJson('/api/admin/franchises/agreements', body)}
            />
          </CardContent>
        </Card>
      ) : null}

      {view === 'royalties' ? (
        <Card>
          <CardHeader>
            <CardTitle>Ventas → regalías</CardTitle>
            <CardDescription>Snapshot inmutable. Cambiar la regla no reescribe historia.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {error.includes('teacher') || error.includes('royalty') ? (
              <p>Esta vista está restringida. Los profesores no ven regalías.</p>
            ) : (
              <>
                <ul className="divide-y divide-pk-border">
                  {calculations.map((row) => (
                    <li key={row.id} className="py-2 font-mono">
                      v{row.ruleVersion} · {row.royaltyDue} COP · {row.calculatedAt}
                    </li>
                  ))}
                </ul>
                <RoyaltyForm unitId={firstUnit} />
              </>
            )}
          </CardContent>
        </Card>
      ) : null}

      {view === 'audits' ? (
        <Card>
          <CardHeader>
            <CardTitle>Auditorías y acciones correctivas</CardTitle>
            <CardDescription>Hallazgos y due dates persistidos en 0098.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <ul className="divide-y divide-pk-border">
              {audits.map((row) => (
                <li key={row.id} className="py-2">
                  {row.status} · {row.auditor} · {row.id.slice(0, 8)}
                </li>
              ))}
            </ul>
            <AuditForm unitId={firstUnit} />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function TerritoryForm(props: {
  unitId: string;
  onSubmit: (body: Record<string, unknown>) => Promise<void>;
}): React.ReactElement {
  async function onSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await props.onSubmit({
      name: String(form.get('name') ?? ''),
      unitId: props.unitId || null,
      exclusive: true,
      exclusiveFor: 'fixed_location',
      validFrom: String(form.get('validFrom') ?? ''),
      geo: {
        kind: 'municipality',
        code: 'CO',
        name: String(form.get('adminName') ?? ''),
      },
    });
  }
  return (
    <form className="grid gap-2 sm:grid-cols-3" onSubmit={(event) => void onSubmit(event)}>
      <input name="name" required placeholder="Nombre" className="rounded border border-pk-border px-2 py-1" />
      <input name="adminName" required placeholder="Municipio" className="rounded border border-pk-border px-2 py-1" />
      <input name="validFrom" type="date" required className="rounded border border-pk-border px-2 py-1" />
      <Button type="submit" size="sm">Crear territorio</Button>
    </form>
  );
}

function AgreementForm(props: {
  unitId: string;
  onSubmit: (body: Record<string, unknown>) => Promise<void>;
}): React.ReactElement {
  async function onSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await props.onSubmit({
      legalName: String(form.get('legalName') ?? ''),
      unitIds: props.unitId ? [props.unitId] : [],
      effectiveDate: String(form.get('effectiveDate') ?? ''),
      expirationDate: String(form.get('expirationDate') ?? ''),
    });
  }
  return (
    <form className="grid gap-2 sm:grid-cols-3" onSubmit={(event) => void onSubmit(event)}>
      <input name="legalName" required placeholder="Razón social" className="rounded border border-pk-border px-2 py-1" />
      <input name="effectiveDate" type="date" required className="rounded border border-pk-border px-2 py-1" />
      <input name="expirationDate" type="date" required className="rounded border border-pk-border px-2 py-1" />
      <Button type="submit" size="sm">Crear contrato</Button>
    </form>
  );
}

function RoyaltyForm(props: { unitId: string }): React.ReactElement {
  const [reportId, setReportId] = useState('');
  async function onSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const gross = Number(form.get('gross') ?? 0);
    const res = await fetch('/api/admin/franchises/sales-reports', {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        unitId: props.unitId,
        periodStart: String(form.get('periodStart') ?? ''),
        periodEnd: String(form.get('periodEnd') ?? ''),
        grossSales: gross,
        source: 'manual',
        sourceReference: String(form.get('ref') ?? ''),
      }),
    });
    const json = (await res.json()) as { report?: { id: string }; error?: string };
    if (!res.ok) throw new Error(json.error || 'No se pudo reportar');
    const id = json.report?.id ?? '';
    setReportId(id);
    const calcRes = await fetch('/api/admin/franchises/royalties/calculate', {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        reportId: id,
        rule: { name: 'Standard 5%', percentage: 5, basis: 'gross_sales' },
      }),
    });
    if (!calcRes.ok) {
      const calcJson = (await calcRes.json()) as { error?: string };
      throw new Error(calcJson.error || 'No se pudo calcular');
    }
  }
  return (
    <form className="grid gap-2 sm:grid-cols-4" onSubmit={(event) => void onSubmit(event)}>
      <input name="periodStart" type="date" required className="rounded border border-pk-border px-2 py-1" />
      <input name="periodEnd" type="date" required className="rounded border border-pk-border px-2 py-1" />
      <input name="gross" type="number" required placeholder="Ventas brutas COP" className="rounded border border-pk-border px-2 py-1" />
      <input name="ref" placeholder="source ref" className="rounded border border-pk-border px-2 py-1" />
      <Button type="submit" size="sm">Reportar y calcular</Button>
      {reportId ? <p className="text-xs text-pk-sub">report {reportId.slice(0, 8)}</p> : null}
    </form>
  );
}

function AuditForm(props: { unitId: string }): React.ReactElement {
  const [auditId, setAuditId] = useState('');
  const [findingId, setFindingId] = useState('');
  async function createAudit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const res = await fetch('/api/admin/franchises/audits', {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ unitId: props.unitId, auditor: 'ops' }),
    });
    const json = (await res.json()) as { audit?: { id: string }; error?: string };
    if (!res.ok) throw new Error(json.error || 'No se pudo crear auditoría');
    setAuditId(json.audit?.id ?? '');
  }
  async function createFinding(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const res = await fetch('/api/admin/franchises/audits/findings', {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        auditId,
        unitId: props.unitId,
        severity: 'major',
        notes: String(form.get('notes') ?? ''),
      }),
    });
    const json = (await res.json()) as { finding?: { id: string }; error?: string };
    if (!res.ok) throw new Error(json.error || 'No se pudo crear hallazgo');
    setFindingId(json.finding?.id ?? '');
  }
  async function createAction(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const res = await fetch('/api/admin/franchises/corrective-actions', {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        findingId,
        unitId: props.unitId,
        owner: String(form.get('owner') ?? ''),
        dueDate: String(form.get('dueDate') ?? ''),
      }),
    });
    if (!res.ok) {
      const json = (await res.json()) as { error?: string };
      throw new Error(json.error || 'No se pudo crear acción');
    }
  }
  return (
    <div className="space-y-3">
      <form onSubmit={(event) => void createAudit(event)}>
        <Button type="submit" size="sm">Crear auditoría</Button>
        {auditId ? <span className="ml-2 text-xs">{auditId.slice(0, 8)}</span> : null}
      </form>
      <form className="flex gap-2" onSubmit={(event) => void createFinding(event)}>
        <input name="notes" required placeholder="Hallazgo" className="rounded border border-pk-border px-2 py-1" />
        <Button type="submit" size="sm" disabled={!auditId}>Añadir hallazgo</Button>
      </form>
      <form className="flex gap-2" onSubmit={(event) => void createAction(event)}>
        <input name="owner" required placeholder="Owner" className="rounded border border-pk-border px-2 py-1" />
        <input name="dueDate" type="date" required className="rounded border border-pk-border px-2 py-1" />
        <Button type="submit" size="sm" disabled={!findingId}>Acción correctiva</Button>
      </form>
    </div>
  );
}
