'use client';

import { useCallback, useMemo, useState } from 'react';
import type { DashboardData } from '@/lib/types';
import { AdminShell } from '@/components/admin/admin-shell';
import { TeamPanel } from '@/components/admin/team-panel';
import { ClassesPanel } from '@/components/admin/classes-panel';
import { StudentsPanel } from '@/components/admin/students-panel';
import { DashboardHeader } from '@/components/admin/dashboard-header';
import { DashboardStatsGrid } from '@/components/admin/dashboard-stats-grid';
import { DashboardActivityCards } from '@/components/admin/dashboard-activity-cards';
import { AcademyOpsMap } from '@/components/admin/academy-ops-map';
import { FamiliesStudentsExpectation } from '@/components/admin/families-students-expectation';
import { TrialClassesPanel } from '@/components/admin/trial-classes-panel';
import { formatRelativeTime } from '@/lib/utils';

interface DashboardViewProps {
  data: DashboardData;
  lastUpdated: Date;
  range: 'week' | 'month';
  onRangeChange: (range: 'week' | 'month') => void;
  onRefresh: () => void;
  refreshing: boolean;
  surface?: 'admin' | 'support';
}

export function DashboardView({
  data,
  lastUpdated,
  range,
  onRangeChange,
  onRefresh,
  refreshing,
  surface = 'admin',
}: DashboardViewProps): React.ReactElement {
  const isSupportSurface = surface === 'support';
  const [search, setSearch] = useState('');

  const messageSummary = useMemo(() => {
    return data.recent_messages.reduce(
      (acc, msg) => {
        const status = msg.status ?? 'pending';
        acc[status] = (acc[status] ?? 0) + 1;
        if (status === 'pending') {
          if (msg.conversation_mode === 'support') acc.supportPending += 1;
          else acc.admissionsPending += 1;
        }
        return acc;
      },
      {
        pending: 0,
        approved: 0,
        sent: 0,
        supportPending: 0,
        admissionsPending: 0,
      } as Record<'pending' | 'approved' | 'sent', number> & {
        supportPending: number;
        admissionsPending: number;
      }
    );
  }, [data.recent_messages]);

  const nextAction = useMemo(() => {
    if (messageSummary.supportPending > 0) {
      return {
        title: 'Resolver soporte de familias',
        description: `${messageSummary.supportPending} caso(s) de soporte esperan revisión.`,
        tone: 'coral' as const,
        anchor: 'mensajes',
      };
    }

    if (!isSupportSurface && messageSummary.admissionsPending > 0) {
      return {
        title: 'Responder admisiones pendientes',
        description: `${messageSummary.admissionsPending} conversación(es) esperan revisión.`,
        tone: 'amber' as const,
        anchor: 'mensajes',
      };
    }

    if (!isSupportSurface && data.pending_followups_count > 0) {
      return {
        title: 'Cerrar seguimientos abiertos',
        description: `${data.pending_followups_count} seguimiento(s) siguen en cola.`,
        tone: 'coral' as const,
        anchor: 'follow-up',
      };
    }

    if (!isSupportSurface && data.new_leads_count > 0) {
      return {
        title: 'Trabajar nuevos interesados',
        description: `${data.new_leads_count} interesado(s) listos para contacto.`,
        tone: 'teal' as const,
        anchor: 'leads',
      };
    }

    return {
      title: 'Todo al día',
      description: 'No hay acciones urgentes en este momento.',
      tone: 'green' as const,
      anchor: 'dashboard',
    };
  }, [
    data.new_leads_count,
    data.pending_followups_count,
    messageSummary.admissionsPending,
    messageSummary.supportPending,
    isSupportSurface,
  ]);

  const syncLabel = useMemo(() => formatRelativeTime(lastUpdated), [lastUpdated]);

  const handleCopy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      window.prompt('Copia este texto', text);
    }
  }, []);

  const scrollToSection = useCallback((anchor: string) => {
    const target = document.querySelector(`[data-admin-section="${anchor}"]`);
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  return (
    <AdminShell lastUpdated={lastUpdated} onRefresh={onRefresh} refreshing={refreshing}>
      <DashboardHeader
        data={data}
        range={range}
        onRangeChange={onRangeChange}
        search={search}
        onSearchChange={setSearch}
        nextAction={nextAction}
        syncLabel={syncLabel}
        onScrollToSection={scrollToSection}
        onCopySync={() => void handleCopy(syncLabel)}
        messageSummary={messageSummary}
      />

      <AcademyOpsMap data={data} />

      {!isSupportSurface ? <FamiliesStudentsExpectation activeStudentsCount={data.active_students_count} /> : null}

      {!isSupportSurface ? (
        <>
          <div className="mb-5">
            <TeamPanel />
          </div>

          <div className="mb-5" data-admin-section="classes">
            <ClassesPanel />
          </div>

          <div className="mb-5">
            <StudentsPanel />
          </div>

          <div className="mb-5">
            <TrialClassesPanel />
          </div>
        </>
      ) : null}

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        <DashboardStatsGrid data={data} search={search} onRefresh={onRefresh} />

        <DashboardActivityCards data={data} />
      </div>
    </AdminShell>
  );
}
