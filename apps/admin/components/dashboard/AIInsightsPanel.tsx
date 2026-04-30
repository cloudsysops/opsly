'use client';

import { BrainCircuit, Sparkles, Radar, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type AIInsightsPanelProps = {
  cpuPercent: number;
  activeTenants: number;
  containers: number;
};

function statusByCpu(cpuPercent: number): 'NEURAL SYNC' | 'PATTERN DETECTED' | 'TEMPORAL DRIFT' {
  if (cpuPercent < 60) {
    return 'NEURAL SYNC';
  }
  if (cpuPercent < 85) {
    return 'PATTERN DETECTED';
  }
  return 'TEMPORAL DRIFT';
}

export function AIInsightsPanel({ cpuPercent, activeTenants, containers }: AIInsightsPanelProps) {
  const status = statusByCpu(cpuPercent);
  const aiLoad = Math.min(100, Math.round((cpuPercent * 0.52 + containers * 0.7 + activeTenants * 1.5) % 100));

  return (
    <Card className="stagger-fade [animation-delay:90ms]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BrainCircuit className="h-4 w-4 text-ops-magenta" />
          IA Insights
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-ops-cyan/40 bg-ops-cyan/10 p-3">
            <div className="mb-1 flex items-center gap-2 text-xs text-ops-cyan">
              <Radar className="h-3.5 w-3.5 animate-pulse-dot" />
              Neural status
            </div>
            <p className="digital-readout text-sm">{status}</p>
          </div>
          <div className="rounded-xl border border-ops-magenta/40 bg-ops-magenta/10 p-3">
            <div className="mb-1 flex items-center gap-2 text-xs text-ops-magenta">
              <Sparkles className="h-3.5 w-3.5 animate-neon-flicker" />
              Predicción 30m
            </div>
            <p className="digital-readout text-sm">
              +{Math.max(3, Math.round(activeTenants * 0.8))}% load trend
            </p>
          </div>
          <div className="rounded-xl border border-ops-purple/40 bg-ops-purple/10 p-3">
            <div className="mb-1 flex items-center gap-2 text-xs text-ops-purple">
              <Zap className="h-3.5 w-3.5 animate-pulse-dot" />
              Sync confidence
            </div>
            <p className="digital-readout text-sm">{Math.max(72, 100 - Math.round(cpuPercent / 2))}%</p>
          </div>
        </div>

        <div className="space-y-2 rounded-xl border border-ops-border bg-ops-bg/60 p-3">
          <div className="flex items-center justify-between text-xs text-ops-gray">
            <span>Holographic activity index</span>
            <span className="digital-readout text-ops-cyan">{aiLoad}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-ops-border/60">
            <div
              className="h-full bg-gradient-to-r from-ops-cyan via-ops-magenta to-ops-purple transition-all duration-700"
              style={{ width: `${aiLoad}%` }}
            />
          </div>
          <p className="text-xs text-neutral-300">
            Sugerencia IA: prioriza workers de inferencia y activa cooldown de pipelines no críticos.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
