'use client'

import { useCallback, useMemo, useState } from 'react'
import type { DashboardData } from '@/lib/types'
import { AdminShell } from '@/components/admin/admin-shell'
import { TeamPanel } from '@/components/admin/team-panel'
import { DashboardHeader } from '@/components/admin/dashboard-header'
import { DashboardStatsGrid } from '@/components/admin/dashboard-stats-grid'
import { DashboardActivityCards } from '@/components/admin/dashboard-activity-cards'
import { formatRelativeTime } from '@/lib/utils'

interface DashboardViewProps {
  data: DashboardData
  lastUpdated: Date
  range: 'week' | 'month'
  onRangeChange: (range: 'week' | 'month') => void
  onRefresh: () => void
  refreshing: boolean
}

export function DashboardView({
  data,
  lastUpdated,
  range,
  onRangeChange,
  onRefresh,
  refreshing,
}: DashboardViewProps): React.ReactElement {
  const [search, setSearch] = useState('')

  const messageSummary = useMemo(() => {
    return data.recent_messages.reduce(
      (acc, msg) => {
        const status = msg.status ?? 'pending'
        acc[status] = (acc[status] ?? 0) + 1
        if (status === 'pending') {
          if (msg.conversation_mode === 'support') acc.supportPending += 1
          else acc.admissionsPending += 1
        }
        return acc
      },
      {
        pending: 0,
        approved: 0,
        sent: 0,
        supportPending: 0,
        admissionsPending: 0,
      } as Record<'pending' | 'approved' | 'sent', number> & {
        supportPending: number
        admissionsPending: number
      }
    )
  }, [data.recent_messages])

  const nextAction = useMemo(() => {
    if (messageSummary.supportPending > 0) {
      return {
        title: 'Resolver soporte de familias',
        description: `${messageSummary.supportPending} caso(s) de soporte esperan revisión.`,
        tone: 'coral' as const,
        anchor: 'mensajes',
      }
    }

    if (messageSummary.admissionsPending > 0) {
      return {
        title: 'Responder admisiones pendientes',
        description: `${messageSummary.admissionsPending} conversación(es) esperan revisión.`,
        tone: 'amber' as const,
        anchor: 'mensajes',
      }
    }

    if (data.pending_followups_count > 0) {
      return {
        title: 'Cerrar seguimientos abiertos',
        description: `${data.pending_followups_count} seguimiento(s) siguen en cola.`,
        tone: 'coral' as const,
        anchor: 'follow-up',
      }
    }

    if (data.new_leads_count > 0) {
      return {
        title: 'Trabajar nuevos leads',
        description: `${data.new_leads_count} lead(s) listos para contacto.`,
        tone: 'teal' as const,
        anchor: 'leads',
      }
    }

    return {
      title: 'Todo al día',
      description: 'No hay acciones urgentes en este momento.',
      tone: 'green' as const,
      anchor: 'dashboard',
    }
  }, [
    data.new_leads_count,
    data.pending_followups_count,
    messageSummary.admissionsPending,
    messageSummary.supportPending,
  ])

  const syncLabel = useMemo(() => formatRelativeTime(lastUpdated), [lastUpdated])

  const handleCopy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      window.prompt('Copia este texto', text)
    }
  }, [])

  const scrollToSection = useCallback((anchor: string) => {
    const target = document.querySelector(`[data-admin-section="${anchor}"]`)
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

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

      <div className="mb-5">
        <TeamPanel />
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        <DashboardStatsGrid data={data} search={search} />

        <DashboardActivityCards data={data} />
      </div>
    </AdminShell>
  )
}
