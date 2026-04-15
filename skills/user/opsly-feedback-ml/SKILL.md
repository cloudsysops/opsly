# Opsly Feedback ML Skill

> **Triggers:** `feedback`, `ml`, `auto-implement`, `aprobación`, `clasificar`, `clasificación`
> **Priority:** MEDIUM
> **Skills relacionados:** `opsly-llm`, `opsly-api`, `opsly-quantum`

## Cuándo usar

Al tocar el flujo de feedback de usuarios, decisiones ML o tablas `feedback_*` / `llm_feedback`.

## Flujo de alto nivel

1. Mensajes en `platform.feedback_conversations` / `feedback_messages`.
2. Motor: `apps/ml/src/feedback-decision-engine.ts` — `analyzeFeedback()` usando `llmCall` (gateway).
3. Decisiones en `platform.feedback_decisions` (`auto_implement`, `needs_approval`, `rejected`, `scheduled`).
4. Auto-implementación seguro: `write-active-prompt` / GitHub según `AGENTS.md`.
5. Aprobación humana: API `POST /api/feedback/approve` y panel admin.

## Auto-implement (solo cambios menores)

- Typos UI, estilos menores, textos de botón/error, enlaces en docs (lista exacta en el código del engine).

## Siempre `needs_approval` (o equivalente)

- Nuevas features, lógica de negocio, pricing, integraciones nuevas, seguridad, o `criticality === "critical"`.

## Datos para mejora continua

- `platform.conversations` / métricas de sesión cuando existan.
- `platform.llm_feedback` (rating + correction por mensaje).
- `platform.agent_executions` para trazabilidad de agentes.

## API / portal

- `apps/api/lib/feedback/`, `apps/portal/components/FeedbackChat*.tsx`, migraciones `0010` / `0011`.

## Errores comunes

| Error | Causa | Solución |
|-------|-------|----------|
| needs_approval siempre | criticality alta | Verificar engine decision |
| auto_implement falló | write-active-prompt | Verificar permisos GitHub |

## Testing

```bash
# Test decision engine
node -e "const {analyzeFeedback} = require('./apps/ml/src/feedback-decision-engine'); analyzeFeedback({criticality:'low'}).then(console.log)"

# Test approval endpoint
curl -sf -X POST https://api.ops.smiletripcare.com/api/feedback/approve \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"conversation_id":"conv_xxx"}'
```
