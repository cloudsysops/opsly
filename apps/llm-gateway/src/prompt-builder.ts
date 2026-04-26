import type { EnrichedContext } from './context-enricher.js';
import type { DetectedIntent, IntentKind } from './types.js';

function formatSectionByIntent(intent: IntentKind): string {
  switch (intent) {
    case 'bug_fix':
      return 'Formato: pasos de reproducción, causa probable, parche o diff sugerido (markdown), y pruebas.';
    case 'feature_request':
      return 'Formato: alcance, API/contratos, archivos a tocar, criterios de aceptación (lista).';
    case 'refactor':
      return 'Formato: plan incremental, riesgos, y código refactorizado en bloques ```.';
    case 'deploy':
      return 'Formato: comandos bash idempotentes, checklist pre/post deploy, rollback.';
    case 'analysis':
      return 'Formato: hallazgos con evidencia (archivos/líneas), conclusiones y siguientes pasos.';
    case 'config':
      return 'Formato: variables exactas, dónde definirlas (Doppler/VPS), sin secretos en claro.';
    case 'question':
    default:
      return 'Formato: respuesta clara en markdown; código solo si aplica.';
  }
}

export function buildPrompt(
  userRequest: string,
  intent: DetectedIntent,
  ctx: EnrichedContext
): string {
  const tech = [
    `Stack: Next.js 15, TypeScript estricto (sin any), Tailwind, Supabase, Docker Compose, Traefik v3.`,
    intent.affected_area
      ? `Área detectada: ${intent.affected_area} (equipo sugerido: ${intent.suggested_team}).`
      : '',
    intent.urgency ? `Urgencia: ${intent.urgency}.` : '',
    ctx.tenant
      ? `Tenant: slug=${ctx.tenant.slug}, plan=${ctx.tenant.plan}, owner=${ctx.tenant.owner_email}. Servicios: ${JSON.stringify(ctx.tenant.services ?? {})}`
      : 'Tenant: (sin fila en Supabase o timeout)',
    ctx.repo.paths.length > 0
      ? `Archivos relevantes (rg):\n${ctx.repo.paths.map((p) => `- ${p}`).join('\n')}`
      : 'Archivos relevantes: (ninguno en ventana de búsqueda)',
    ctx.rag.length > 0
      ? `Fragmentos RAG:\n${ctx.rag.map((r) => `--- (${r.similarity.toFixed(2)})\n${r.content.slice(0, 1200)}`).join('\n')}`
      : '',
    ctx.sessions.length > 0
      ? `Historial reciente (Redis): ${ctx.sessions.map((s) => s.preview.slice(0, 120)).join(' | ')}`
      : '',
    ctx.errors.length > 0 ? `Notas enriquecimiento: ${ctx.errors.join('; ')}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  const examples =
    ctx.feedback.length > 0
      ? ctx.feedback
          .map(
            (f, i) =>
              `### Ejemplo resuelto ${i + 1}\nRazonamiento: ${f.reasoning.slice(0, 800)}\n${f.implementation_prompt ? `Prompt implementación: ${f.implementation_prompt.slice(0, 800)}` : ''}`
          )
          .join('\n\n')
      : '(Sin feedback similar auto_implement en histórico.)';

  const constraints = [
    'TypeScript: no usar any.',
    'Bash: set -euo pipefail; scripts idempotentes; --dry-run donde cambie estado.',
    'No hardcodear secretos, URLs de prod ni tokens en respuestas.',
    'Respetar decisiones fijas del repo (Traefik v3, Doppler, schema platform en Supabase).',
  ].join('\n- ');

  return `## Contexto técnico
${tech}

## Tarea específica
${userRequest}

## Constraints
- ${constraints}

## Formato esperado
${formatSectionByIntent(intent.intent)}

## Ejemplos relevantes
${examples}
`;
}
