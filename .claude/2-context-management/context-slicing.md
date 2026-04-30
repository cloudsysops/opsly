# Context Slicing — Reducir Contexto

Estrategias para no saturar el contexto con datos innecesarios.

## 1. Context Compressor
```typescript
// Si existe lib/ai/context-compressor.ts
import { compressContext } from '@/lib/ai/context-compressor';
const sliced = compressContext(fullContext, { maxTokens: 4000 });
```

## 2. Solo Archivos Relevantes
- **Rutas API**: `apps/api/app/api/portal/tenant/[slug]/route.ts` + `lib/portal-trusted-identity.ts`
- **Workers**: `apps/orchestrator/src/workers/ollama-worker.ts` + `types.ts`
- **UI**: Solo componente afectado + `lib/tenant.ts`

## 3. Filtrado por Tenant
```typescript
// Mal: mezcla tenants
const all = await supabase.from('platform.tenants').select('*');

// Bien: solo uno
const { data } = await supabase.from('platform.tenants')
  .select('*').eq('slug', tenant_slug).single();
```

## 4. Resúmenes, no Logs
```typescript
// Mal: 1000 líneas de logs
// Bien: resumen estructurado
const summary = { total_jobs: 1234, failed: 5, avg_duration_ms: 340 };
```

## 5. Lazy Loading Docs
| Tarea | Doc a leer |
|------|-------------|
| Onboarding | `docs/runbooks/TENANT-ONBOARDING-TRIAGE.md` |
| Deploy | `docs/runbooks/DEPLOY-GITHUB-ACTIONS.md` |
| Seguridad | `docs/SECURITY_CHECKLIST.md` |
| Costos | `docs/COST-DASHBOARD.md` |

## Referencias
- `docs/CLAUDE-WORKFLOW-OPTIMIZATION.md` — 10 técnicas
- `context/system_state.json` — snapshots de estado
- `AGENTS.md` — leer completo al iniciar, no re-enviar
