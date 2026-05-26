---
status: active
owner: engineering
last_review: 2026-05-26
type: config
tags:
  - opsly/claude-config
  - engineering-skills
---

# /skill — Engineering Skill Discovery & Invocation

Descubre y activa el skill de ingeniería correcto para la tarea actual.

## Uso

```bash
# Encontrar el skill correcto para una tarea
node scripts/skill-finder.js "mi tarea aquí" --autonomous

# Leer un skill específico directamente
cat skills/vendor/agent-skills/<skill-name>/SKILL.md
cat skills/user/<skill-name>/SKILL.md
```

## Skill Decision Tree

```
¿No sé qué quiero? ──────────────→ interview-me
¿Idea vaga? ─────────────────────→ idea-refine
¿Sin spec? ──────────────────────→ spec-driven-development
¿Tengo spec, necesito tareas? ───→ planning-and-task-breakdown
¿Implementando código? ──────────→ incremental-implementation
  ├── UI/React/Tailwind? ────────→ frontend-ui-engineering
  ├── API/endpoint? ─────────────→ api-and-interface-design
  ├── Lib externa/SDK? ───────────→ source-driven-development
  └── Código de alto riesgo? ────→ doubt-driven-development
¿Escribiendo tests? ─────────────→ test-driven-development
  └── Browser/E2E? ──────────────→ browser-testing-with-devtools
¿Algo roto? ─────────────────────→ debugging-and-error-recovery
¿Code review? ───────────────────→ code-review-and-quality
  ├── Seguridad? ──────────────── → security-and-hardening
  └── Performance? ───────────── → performance-optimization
¿Commiteando? ───────────────────→ git-workflow-and-versioning
¿CI/CD pipeline? ────────────────→ ci-cd-and-automation
¿Documentando? ──────────────────→ documentation-and-adrs
¿Desplegando? ───────────────────→ shipping-and-launch
```

## Engineering Skills Disponibles (23)

| Skill | Cuándo |
|-------|--------|
| `using-agent-skills` | Meta-skill: discovery |
| `spec-driven-development` | Antes de codear |
| `planning-and-task-breakdown` | Descomponer trabajo |
| `incremental-implementation` | Implementar features |
| `test-driven-development` | Escribir tests |
| `browser-testing-with-devtools` | Tests E2E/browser |
| `debugging-and-error-recovery` | Algo roto |
| `code-review-and-quality` | Antes de merge |
| `security-and-hardening` | Seguridad/auth |
| `api-and-interface-design` | Diseñar APIs |
| `frontend-ui-engineering` | UI/React |
| `git-workflow-and-versioning` | Git/PRs |
| `shipping-and-launch` | Deploy a prod |
| `ci-cd-and-automation` | Pipelines CI |
| `performance-optimization` | Lentitud/latencia |
| `documentation-and-adrs` | ADRs/runbooks |
| `code-simplification` | Refactor/simplificar |
| `context-engineering` | Gestión contexto agente |
| `doubt-driven-development` | Revisión adversarial |
| `source-driven-development` | Verificar docs oficiales |
| `deprecation-and-migration` | Deprecar/migrar |
| `idea-refine` | Ideas vagas |
| `interview-me` | Reqs no claros |

## Opsly Skills Propios

Ver tabla completa en CLAUDE.md sección "SKILLS INDEX".

## Localización

```
skills/
├── vendor/
│   └── agent-skills/        ← addyosmani/agent-skills (23 skills)
│       ├── <skill>/
│       │   ├── SKILL.md
│       │   └── manifest.json
│       └── ...
└── user/                    ← Skills propios de Opsly
    ├── opsly-context/
    ├── opsly-api/
    └── ...
```

## Referencias

- `skills/index.json` — índice completo (60 skills)
- `skills/vendor/agent-skills/using-agent-skills/SKILL.md` — meta-skill
- `scripts/skill-finder.js` — discovery automático con fuzzy matching

---

## Enlaces relacionados

- [[.claude/README|.claude]]
- [[README|Inicio]]
