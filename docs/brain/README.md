---
status: canon
owner: operations
last_review: 2026-09-15
tags:
  - opsly/brain
  - moc
---

# Opsly Brain

Vault Obsidian canonico para conectar codigo, arquitectura, agentes, tenants, workflows, decisiones y handoffs. GitHub/repo sigue siendo la fuente de verdad del codigo; Brain conserva conocimiento navegable para que un agente nuevo pueda continuar trabajo sin depender de un chat anterior.

## Entrada rapida

- [[brain/INDEX|Indice Maestro]] — punto de entrada unico.
- [[brain/AGENT-ONBOARDING|Agent Onboarding]] — arranque de agentes.
- [[brain/agents/README|Agents MOC]] — runtimes, contratos y handoff obligatorio.
- [[brain/sessions/index|Agent Sessions]] — ledger de contexto/handoffs por trabajo.
- [[brain/modules/README|Modules MOC]] — apps, paquetes y servicios.
- [[brain/workflows/README|Workflows MOC]] — automatizaciones y runtime flows.
- [[brain/architecture/README|Architecture MOC]] — decisiones/mapas tecnicos.
- [[brain/tenants/README|Tenants MOC]] — contexto tenant cuando aplique.

## Read -> Work -> Evidence -> Writeback

Todo worker debe leer contexto antes de actuar y escribir conocimiento despues de actuar.

```text
Repo + canonical docs + Brain
          |
          v
      agent work
          |
          v
 machine evidence / handoff
          |
          +--> session context when useful for continuation
          |
          +--> durable knowledge promoted to owning docs/Brain note
          |
          v
 knowledge-index / Obsidian index refresh
          |
          v
      next agent
```

El writeback es parte del Definition of Done para cambios materiales. No basta con dejar codigo y una frase en el chat. Cada intento conserva evidencia; cada descubrimiento durable se promueve a la documentacion dueña. Un retry nunca borra la historia anterior.

## Mapa

| Area | Uso |
| --- | --- |
| `modules/` | Conocimiento durable por app/package/modulo |
| `agents/` | Roles, limites, contratos y handoffs |
| `sessions/` | Contexto operativo temporal por trabajo/intento |
| `tenants/` | Contexto operativo por tenant cuando aplique |
| `workflows/` | n8n, Hermes, OpenClaw y automatizaciones |
| `architecture/` | Mapas/decisiones tecnicas durables |
| `runbooks/` | Procedimientos operativos |
| `generated/` | Salidas regenerables; no editar a mano |

## Reglas

- No crear un segundo Brain o memoria privada como fuente canonica.
- No guardar secretos, tokens, credenciales, PII ni dumps de entorno.
- Todo trabajo autonomo material produce evidence/handoff ligado a `work_id`/`request_id`.
- Una session note no sustituye docs canonicas: conocimiento durable se promueve a su owner.
- Si un modulo no tiene nota Brain, crear una minima antes de autonomia recurrente sobre ese modulo.
- Tras cambios documentales ejecutar `npm run index-knowledge`; si se toca el vault, tambien `npm run obsidian:file-index`, o registrar explicitamente por que el runtime no pudo hacerlo.
- El reconciler debe considerar writeback/documentation incompleto como cierre pendiente cuando el cambio lo requiere.

## Contrato

Ver [[03-agents/AGENT-BRAIN-CONTRACT|Agent Brain Contract]] y [[brain/agents/README|Agents MOC]].
