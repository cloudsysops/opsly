'use client'

import { useMemo, useState } from 'react'
import {
  CalendarClock,
  MessageSquare,
  Star,
  UserPlus,
  Users,
} from 'lucide-react'
import type { DashboardData } from '@/lib/types'
import { AdminShell } from '@/components/admin/admin-shell'
import { MessageInboxPanel } from '@/components/admin/message-inbox-panel'
import { StatCard } from '@/components/admin/stat-card'
import { classModalityLabel } from '@/lib/lead-modality'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface DashboardViewProps {
  data: DashboardData
  lastUpdated: Date
  onRefresh: () => void
  refreshing: boolean
}

function StarRating({ value }: { value: number }): React.ReactElement {
  return (
    <span className="inline-flex gap-0.5 text-sm" aria-label={`${value} de 5 estrellas`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${i < value ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`}
          aria-hidden
        />
      ))}
    </span>
  )
}

export function DashboardView({
  data,
  lastUpdated,
  onRefresh,
  refreshing,
}: DashboardViewProps): React.ReactElement {
  const [search, setSearch] = useState('')

  const filteredLeads = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return data.new_leads
    return data.new_leads.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.email.toLowerCase().includes(q) ||
        (l.phone?.toLowerCase().includes(q) ?? false) ||
        (l.neighborhood?.toLowerCase().includes(q) ?? false) ||
        classModalityLabel(l.class_modality).toLowerCase().includes(q)
    )
  }, [data.new_leads, search])

  return (
    <AdminShell lastUpdated={lastUpdated} onRefresh={onRefresh} refreshing={refreshing}>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-display text-lg font-semibold text-pk-ink">Resumen operativo</h2>
          <p className="text-sm text-pk-sub">Esta semana · actualización cada 5 s</p>
        </div>
        <label className="w-full sm:max-w-xs">
          <span className="sr-only">Buscar leads</span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, email o teléfono…"
            className="pk-input"
          />
        </label>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        <StatCard
          title="Leads nuevos"
          description="Esta semana"
          value={data.new_leads_count}
          icon={UserPlus}
          accent="teal"
        >
          <ul className="max-h-52 space-y-3 overflow-y-auto pr-1">
            {filteredLeads.length > 0 ? (
              filteredLeads.map((lead) => (
                <li
                  key={lead.id}
                  className="rounded-lg border border-pk-border/80 bg-pk-muted/50 px-3 py-2.5"
                >
                  <p className="font-medium text-sm text-pk-ink">{lead.name}</p>
                  <p className="text-xs text-pk-sub">{lead.email}</p>
                  {lead.phone ? <p className="text-xs text-pk-sub">{lead.phone}</p> : null}
                  {lead.neighborhood ? (
                    <p className="text-xs text-pk-sub">Barrio: {lead.neighborhood}</p>
                  ) : null}
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Badge tone="amber">{classModalityLabel(lead.class_modality)}</Badge>
                    <Badge tone="teal">{lead.grade_interested}</Badge>
                  </div>
                </li>
              ))
            ) : (
              <p className="text-sm text-pk-sub">
                {search ? 'Sin coincidencias para tu búsqueda.' : 'Sin leads nuevos esta semana.'}
              </p>
            )}
          </ul>
        </StatCard>

        <StatCard
          title="Estudiantes activos"
          description="Matrícula actual"
          value={data.active_students_count}
          icon={Users}
          accent="green"
        >
          <ul className="space-y-2">
            {Object.entries(data.students_by_grade).length > 0 ? (
              Object.entries(data.students_by_grade).map(([grade, count]) => (
                <li key={grade} className="flex justify-between text-sm">
                  <span className="text-pk-sub">Grado {grade}</span>
                  <span className="font-semibold tabular-nums text-pk-ink">{count}</span>
                </li>
              ))
            ) : (
              <p className="text-sm text-pk-sub">Aún no hay estudiantes activos registrados.</p>
            )}
          </ul>
        </StatCard>

        <StatCard
          title="Feedback reciente"
          description="Últimas respuestas de padres"
          value={data.recent_feedback.length}
          icon={Star}
          accent="amber"
        >
          <ul className="max-h-52 space-y-3 overflow-y-auto">
            {data.recent_feedback.length > 0 ? (
              data.recent_feedback.map((fb) => (
                <li key={fb.id} className="border-b border-pk-border/60 pb-3 last:border-0 last:pb-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-pk-ink">{fb.child_name}</p>
                    <StarRating value={fb.satisfaction} />
                  </div>
                  {fb.suggestion ? (
                    <p className="mt-1 text-xs italic text-pk-sub line-clamp-2">
                      &quot;{fb.suggestion}&quot;
                    </p>
                  ) : null}
                </li>
              ))
            ) : (
              <p className="text-sm text-pk-sub">Sin comentarios todavía.</p>
            )}
          </ul>
        </StatCard>

        <StatCard
          title="Seguimientos pendientes"
          description="Por completar"
          value={data.pending_followups_count}
          icon={CalendarClock}
          accent="coral"
        >
          <ul className="max-h-52 space-y-2 overflow-y-auto">
            {data.pending_followups.length > 0 ? (
              data.pending_followups.map((fu) => (
                <li
                  key={fu.id}
                  className="rounded-lg bg-rose-50/60 px-3 py-2 text-xs text-pk-ink"
                >
                  <span className="font-semibold uppercase tracking-wide text-pk-coral">
                    {fu.type}
                  </span>
                  <p className="mt-1 text-pk-sub">
                    Vence {new Date(fu.due_date).toLocaleDateString('es-CO')}
                  </p>
                </li>
              ))
            ) : (
              <p className="text-sm text-pk-sub">¡Al día! No hay seguimientos pendientes.</p>
            )}
          </ul>
        </StatCard>

        <StatCard
          title="Mensajes entrantes"
          description="WhatsApp · Instagram · Web"
          value={data.recent_messages.length}
          icon={MessageSquare}
          accent="violet"
        >
          <MessageInboxPanel messages={data.recent_messages} />
        </StatCard>

        <Card accent="slate" className="md:col-span-2 xl:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">KPI rápidos</CardTitle>
            <CardDescription>Salud del embudo esta semana</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="rounded-xl bg-pk-muted p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-pk-sub">Leads</p>
              <p className="mt-1 font-display text-2xl font-bold text-pk-primary">
                {data.new_leads_count}
              </p>
            </div>
            <div className="rounded-xl bg-pk-muted p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-pk-sub">Alertas</p>
              <p className="mt-1 font-display text-2xl font-bold text-pk-coral">
                {data.pending_followups_count}
              </p>
            </div>
            <div className="col-span-2 rounded-xl border border-dashed border-pk-border bg-teal-50/50 p-4 text-sm text-pk-sub">
              Los webhooks de Jelou y n8n alimentan este panel. Revisa Uptime Kuma y los flujos en{' '}
              <span className="font-medium text-pk-primary">n8n-peskids</span> si algo no aparece.
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminShell>
  )
}
