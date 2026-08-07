'use client';

import { MessageCircle, Sparkles, Target } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

/** v1: static/illustrative panel. Peskids has no automation-toggle or
 * agent-status backend yet — this shows what's planned/available rather
 * than faking live state. Wire to real data once
 * lib/agents (apps/peskids/lib/agents) exposes a status endpoint. */
const AUTOMATIONS = [
  { id: 'welcome', label: 'Bienvenida interesados', status: 'active' as const },
  { id: 'trial-reminder', label: 'Recordatorio clase de prueba', status: 'active' as const },
  { id: 'post-trial', label: 'Seguimiento post-prueba', status: 'testing' as const },
  { id: 'reactivation', label: 'Reactivación inactivos 7 días', status: 'active' as const },
];

const AGENTS = [
  {
    id: 'operations',
    label: 'Operations Agent',
    detail: 'Revisa pendientes y agenda',
    icon: Target,
  },
  {
    id: 'support',
    label: 'Support Agent',
    detail: 'Responde mensajes y dudas',
    icon: MessageCircle,
  },
];

const STATUS_LABEL: Record<'active' | 'testing', string> = {
  active: 'Activa',
  testing: 'En prueba',
};

const STATUS_TONE: Record<'active' | 'testing', 'green' | 'amber'> = {
  active: 'green',
  testing: 'amber',
};

export function MissionControlAgentsPanel(): React.ReactElement {
  return (
    <div className="space-y-4">
      <Card accent="slate" className="border-pk-border">
        <CardHeader className="py-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Sparkles className="h-4 w-4 text-pk-mutedText" aria-hidden />
            Automatizaciones
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 py-3">
          {AUTOMATIONS.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-2 rounded-xl border border-pk-border/70 bg-pk-surface px-3 py-2 text-sm"
            >
              <span className="min-w-0 truncate text-pk-ink">{item.label}</span>
              <Badge tone={STATUS_TONE[item.status]}>{STATUS_LABEL[item.status]}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card accent="slate" className="border-pk-border">
        <CardHeader className="py-3">
          <CardTitle className="text-sm">Agentes Opsly</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 py-3 sm:grid-cols-2">
          {AGENTS.map((agent) => {
            const Icon = agent.icon;
            return (
              <div
                key={agent.id}
                className="rounded-2xl border border-pk-border/70 bg-pk-surface p-3 text-center"
              >
                <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-2xl bg-teal-50 text-pk-primary dark:bg-teal-400/10 dark:text-teal-300">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <p className="mt-2 text-sm font-semibold text-pk-ink">{agent.label}</p>
                <p className="mt-0.5 flex items-center justify-center gap-1 text-[11px] text-emerald-700 dark:text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
                  Disponible
                </p>
                <p className="mt-1 text-[11px] text-pk-sub">{agent.detail}</p>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
