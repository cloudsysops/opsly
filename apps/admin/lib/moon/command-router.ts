/**
 * Opsly Moon Command Center — local dry-run router.
 * No LLM, no Orchestrator enqueue, no deploy, no external messages.
 */

export type MoonCommandSuggestion = {
  href: string;
  label: string;
  keywords: string[];
};

export const MOON_COMMAND_SUGGESTIONS: MoonCommandSuggestion[] = [
  {
    href: '/moon/clients',
    label: 'Listar clientes',
    keywords: ['clientes', 'tenants', 'degradados', 'cartera'],
  },
  {
    href: '/moon/health',
    label: 'Inspeccionar health / VPS',
    keywords: ['health', 'salud', 'vps', 'ram', 'cpu', 'deploy'],
  },
  {
    href: '/moon/tasks',
    label: 'Resumir tasks bloqueadas / cola',
    keywords: ['tasks', 'tareas', 'cola', 'queue', 'bullmq', 'bloqueadas'],
  },
  {
    href: '/moon/queue',
    label: 'Ver profundidad de queue',
    keywords: ['queue', 'waiting', 'active', 'cola'],
  },
  {
    href: '/moon/agents',
    label: 'Revisar agentes sin heartbeat simulado',
    keywords: ['agentes', 'agents', 'fleet', 'heartbeat', 'offline'],
  },
  {
    href: '/moon/usage',
    label: 'Comparar usage (sin MRR)',
    keywords: ['usage', 'uso', 'tokens', 'llm', 'mrr'],
  },
  {
    href: '/moon/costs',
    label: 'Revisar costos etiquetados',
    keywords: ['costos', 'costs', 'presupuesto', 'estimado'],
  },
  {
    href: '/moon/approvals',
    label: 'Approvals pendientes',
    keywords: ['approvals', 'aprobaciones', 'gate'],
  },
  {
    href: '/moon/deployments',
    label: 'Inspect deploy (doc only)',
    keywords: ['deploy', 'deployment', 'rollback', 'actions'],
  },
  {
    href: '/moon/reports',
    label: 'Generar / abrir reportes existentes',
    keywords: ['reporte', 'reportes', 'metrics', 'informe'],
  },
];

/**
 * Filter suggestions by query. Empty query → full catalog.
 */
export function matchMoonCommands(query: string): MoonCommandSuggestion[] {
  const q = query.trim().toLowerCase();
  if (!q) {
    return [...MOON_COMMAND_SUGGESTIONS];
  }
  return MOON_COMMAND_SUGGESTIONS.filter((s) => {
    if (s.label.toLowerCase().includes(q)) return true;
    if (s.href.toLowerCase().includes(q)) return true;
    return s.keywords.some((k) => k.includes(q) || q.includes(k));
  });
}
