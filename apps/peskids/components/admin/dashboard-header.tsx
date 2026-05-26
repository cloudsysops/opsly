'use client';

import { Copy } from 'lucide-react';
import type { DashboardData } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface DashboardHeaderProps {
  data: DashboardData;
  range: 'week' | 'month';
  onRangeChange: (range: 'week' | 'month') => void;
  search: string;
  onSearchChange: (search: string) => void;
  nextAction: {
    title: string;
    description: string;
    tone: 'amber' | 'coral' | 'teal' | 'green';
    anchor: string;
  };
  syncLabel: string;
  onScrollToSection: (anchor: string) => void;
  onCopySync: () => void;
  messageSummary: {
    pending: number;
    approved: number;
    sent: number;
    supportPending: number;
    admissionsPending: number;
  };
}

export function DashboardHeader({
  data,
  range,
  onRangeChange,
  search,
  onSearchChange,
  nextAction,
  syncLabel,
  onScrollToSection,
  onCopySync,
  messageSummary,
}: DashboardHeaderProps): React.ReactElement {
  return (
    <section
      data-admin-section="dashboard"
      className="mb-6 overflow-hidden rounded-3xl border border-pk-border bg-gradient-to-br from-white via-white to-teal-50/60 p-5 shadow-card sm:p-6"
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-pk-mutedText">
            Peskids / Admin
          </p>
          <h2 className="mt-1 font-display text-2xl font-semibold tracking-tight text-pk-ink sm:text-3xl">
            Operación diaria de familias, leads y soporte.
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-pk-sub">
            Un panel para decidir rápido qué atender, qué cerrar y qué seguir hoy.
          </p>

          <div className="mt-5 flex flex-wrap gap-2 text-[11px] font-medium text-pk-sub">
            <span className="rounded-full border border-pk-border bg-pk-muted px-3 py-1">
              Leads nuevos: {data.new_leads_count}
            </span>
            <span className="rounded-full border border-pk-border bg-pk-muted px-3 py-1">
              Estudiantes activos: {data.active_students_count}
            </span>
            <span className="rounded-full border border-pk-border bg-pk-muted px-3 py-1">
              Seguimientos: {data.pending_followups_count}
            </span>
            <span className="rounded-full border border-pk-border bg-pk-muted px-3 py-1">
              Mensajes: {data.recent_messages.length}
            </span>
          </div>
        </div>

        <div className="grid gap-3 lg:min-w-[360px]">
          <div
            className={cn(
              'rounded-2xl border bg-white px-4 py-4 shadow-sm',
              nextAction.tone === 'amber' && 'border-amber-100',
              nextAction.tone === 'coral' && 'border-orange-100',
              nextAction.tone === 'teal' && 'border-teal-100',
              nextAction.tone === 'green' && 'border-emerald-100'
            )}
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-pk-mutedText">
              Siguiente acción
            </p>
            <p className="mt-1 text-lg font-semibold tracking-tight text-pk-ink">
              {nextAction.title}
            </p>
            <p className="mt-1 text-sm text-pk-sub">{nextAction.description}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" onClick={() => onScrollToSection(nextAction.anchor)}>
                Ir a la cola
              </Button>
              <Button size="sm" variant="ghost" onClick={onCopySync}>
                <Copy className="h-4 w-4" aria-hidden />
                <span className="ml-1">Copiar última sync</span>
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border border-pk-border bg-pk-surface px-4 py-4 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-pk-mutedText">
              Salud de la semana
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-pk-muted px-3 py-2">
                <p className="text-[10px] uppercase tracking-[0.12em] text-pk-mutedText">
                  Atención
                </p>
                <p className="mt-1 text-sm font-semibold text-pk-ink">
                  {messageSummary.supportPending + messageSummary.admissionsPending} pendientes
                </p>
              </div>
              <div className="rounded-xl bg-pk-muted px-3 py-2">
                <p className="text-[10px] uppercase tracking-[0.12em] text-pk-mutedText">
                  Seguimiento
                </p>
                <p className="mt-1 text-sm font-semibold text-pk-ink">
                  {data.pending_followups_count} abiertos
                </p>
              </div>
              <div className="rounded-xl bg-pk-muted px-3 py-2">
                <p className="text-[10px] uppercase tracking-[0.12em] text-pk-mutedText">
                  Captación
                </p>
                <p className="mt-1 text-sm font-semibold text-pk-ink">
                  {data.new_leads_count} leads
                </p>
              </div>
              <div className="rounded-xl bg-pk-muted px-3 py-2">
                <p className="text-[10px] uppercase tracking-[0.12em] text-pk-mutedText">Soporte</p>
                <p className="mt-1 text-sm font-semibold text-pk-ink">
                  {messageSummary.supportPending} casos
                </p>
              </div>
              <div className="rounded-xl bg-pk-muted px-3 py-2">
                <p className="text-[10px] uppercase tracking-[0.12em] text-pk-mutedText">
                  Sincronía
                </p>
                <p className="mt-1 text-sm font-semibold text-pk-ink">{syncLabel}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="text-xs text-pk-sub">
          {messageSummary.supportPending + messageSummary.admissionsPending > 0
            ? 'Atiende soporte de familias primero, luego admisiones, seguimiento y captación.'
            : 'La cola está limpia; revisa leads y seguimientos para mantener el ritmo.'}
        </div>
        <div className="flex flex-col gap-3 lg:items-end">
          <div className="flex flex-wrap gap-2">
            {(['week', 'month'] as const).map((item) => (
              <Button
                key={item}
                type="button"
                size="sm"
                variant={range === item ? 'secondary' : 'ghost'}
                onClick={() => onRangeChange(item)}
              >
                {item === 'week' ? 'Esta semana' : 'Este mes'}
              </Button>
            ))}
          </div>
          <label className="w-full lg:max-w-xs">
            <span className="sr-only">Buscar leads</span>
            <input
              type="search"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Buscar leads…"
              className="pk-input"
            />
          </label>
        </div>
      </div>
    </section>
  );
}
