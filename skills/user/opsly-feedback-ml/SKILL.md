# Opsly Feedback ML Skill

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
