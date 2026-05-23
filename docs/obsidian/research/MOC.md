---
status: moc
owner: operations
last_review: 2026-05-10
type: moc
tags:
  - obsidian/research
---

# MOC - Research

Ideas atómicas derivadas de fuentes. Claims verificables conectados a Opsly.

## Síntesis activas

- [[obsidian/research/pattern-constellation]] — hub principal de patrones reutilizables.
- [[obsidian/research/agent-pattern-matrix]] — runtime Python, security defensiva, training y verticales monetizables.
- [[obsidian/research/frontier-pattern-radar]] — space, navigation, marketing, architecture, time/replay and sink-state patterns.
- [[obsidian/research/pattern-constellation]] — launcher único para todos los radares de patrón.
- [[obsidian/research/saas-pattern-radar]] — white-label, B2B SaaS, admin shells, multi-tenant packaging.
- [[obsidian/research/security-pattern-radar]] — hardening, secrets, scanning, audit, defensive posture.
- [[obsidian/research/trading-pattern-radar]] — signals, backtesting, paper trading, risk, approval.

## Claims abiertos

- [ ] [[obsidian/research/agent-pattern-matrix]] — validar qué parte va a brain/agents y qué parte queda como playbook comercial.
- [ ] [[obsidian/research/frontier-pattern-radar]] — decidir qué patrones son universales y cuáles quedan como verticales.
- [ ] [[obsidian/research/pattern-constellation]] — confirmar orden de arranque y prioridad por dominio.
- [ ] [[obsidian/research/saas-pattern-radar]] — decidir qué patrón queda en blueprint y qué pasa a tenant docs.
- [ ] [[obsidian/research/security-pattern-radar]] — definir qué checks son obligatorios vs opcionales.
- [ ] [[obsidian/research/trading-pattern-radar]] — decidir límites de compliance y aprobación humana.

## Conexión con Opsly

Cada nota en research/ debe responder:
- ¿Cómo afecta al código o arquitectura?
- ¿Cambia algún ADR o decisión documentada?
- ¿Conecta con modules, agents, tenants o workflows de brain/?

## Regla

Cada nota en research/ debe:
- Usar plantilla `templates/evergreen-claim.md`
- Tener frontmatter `status: evergreen` o `status: draft`
- Enlazar a [[obsidian/index]], al menos una fuente en `sources/` y a un MOC de brain/

## Enlaces

- Index: [[obsidian/index]]
- Sources: [[obsidian/sources/MOC]]
- Inbox: [[obsidian/inbox/MOC]]
