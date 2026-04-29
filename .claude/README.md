# .claude/ — Configuración de Claude Code para Opsly

Estructura para gestionar agentes, comandos y hooks en Claude Code dentro del proyecto Opsly (plataforma multi-tenant de agentes de IA).

## Estructura

```
.claude/
├── README.md                    # Este archivo
├── CLAUDE.md                   # Contexto global para Claude (protocolo, skills, reglas)
├── settings.local.json          # Configuración local de permisos
├── setup.sh                    # Script de instalación automática
├── 1-agent-teams/             # Definición de agentes y orchestrator
│   ├── orchestrator.md         # OrchestratorAgent: tipos, patrones, BullMQ/Temporal
│   ├── ops-agent.md            # Agente de operaciones (onboarding, health, deployments)
│   ├── billing-agent.md        # Agente de facturación (Stripe, metering, cost alerts)
│   └── security-agent.md      # Agente de seguridad (Zero-Trust, VLANs, access review)
├── 2-context-management/      # Gestión de contexto y configuración del proyecto
│   ├── CLAUDE.md              # Instrucciones globales del proyecto (stack, reglas, convenciones)
│   ├── CLAUDE.local.md        # Configuración personal (gitignored, tokens de prueba)
│   └── context-slicing.md     # Estrategias para reducir contexto (multi-tenant)
├── 3-slash-commands/          # Comandos slash personalizados
│   ├── ship.md                # /ship — deploy a producción
│   ├── review.md              # /review — code review automático
│   ├── clean.md               # /clean — limpieza de archivos temporales
│   ├── deploy.md              # /deploy — workflow de despliegue Opsly
│   ├── tenant.md              # /tenant — crear/depurar tenant de prueba
│   └── ai-cost.md             # /ai-cost — mostrar consumo de tokens del proyecto
├── 4-hooks/                  # Git hooks automatizados
│   ├── auto-commit.sh         # Auto-commit (no main, conventional commits, verify)
│   ├── lint-on-save.sh        # Lint en archivos staged (lint-staged)
│   ├── post-merge.sh          # Reinstalar dependencias si cambió package-lock.json
│   └── register.json         # Registro de hooks para git
└── .DS_Store                  # (ignorado por git)
```

## Uso Rápido

### 1. Instalación inicial

```bash
# Clonar repo y entrar
cd /opt/opsly

# Dar permisos de ejecución
chmod +x .claude/4-hooks/*.sh
chmod +x .claude/setup.sh

# Ejecutar setup automático
./.claude/setup.sh
```

### 2. Configurar Git Hooks

```bash
# Configurar git para usar los hooks personalizados
cd /opt/opsly
git config core.hooksPath .claude/4-hooks
```

### 3. Usar Comandos Slash

En Claude Code, usa los comandos personalizados:

- `/deploy` — Ejecuta el workflow de despliegue de Opsly
- `/tenant` — Crea o depura un tenant de prueba
- `/ai-cost` — Muestra el consumo de tokens del proyecto
- `/ship` — Deploy rápido a producción
- `/review` — Code review automático
- `/clean` — Limpieza de archivos temporales

### 4. Agentes Disponibles

Los agentes se definen en `1-agent-teams/` y se integran via `CLAUDE.md`:

| Agente | Rol | Triggers |
|--------|-----|----------|
| OrchestratorAgent | Coordina tareas entre agentes | `processIntent()`, cola BullMQ |
| ops-agent | Onboarding, health checks, deployments | `tenant_slug`, alertas Discord |
| billing-agent | Stripe, metering, cost alerts | `GET /api/admin/costs`, LLM Gateway usage |
| security-agent | Zero-Trust, access review | `tenantSlugMatchesSession`, firewall rules |

## Convenciones de Commits

Usar [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(agents): add security-agent for Zero-Trust validation
fix(hooks): prevent auto-commit on main branch
docs(claude): update agent teams documentation
```

## Configuración Personal (CLAUDE.local.md)

El archivo `2-context-management/CLAUDE.local.md` está ignorado por git y es ideal para:
- Tokens de prueba
- Configuraciones de desarrollo local
- Overrides de puertos o URLs

**Nunca commitear secretos reales.**

## Multi-Tenancy

Opsly es una plataforma multi-tenant. Las reglas críticas (ver `CLAUDE.md` y `2-context-management/CLAUDE.md`):
- Nunca mezclar datos de tenants
- Siempre incluir `tenant_slug` y `request_id` en jobs/orquestación
- Usar `tenantSlugMatchesSession` en rutas con `[slug]`

## Stack Tecnológico

Next.js 15 · TypeScript · Tailwind · shadcn/ui · Supabase · Stripe ·
Docker Compose · Traefik v3 · Redis/BullMQ · Doppler · Resend · Discord

## Referencias

- **AGENTS.md**: Fuente de verdad operativa (`/opt/opsly/AGENTS.md`)
- **VISION.md**: Norte del producto Opsly
- **ROADMAP.md**: Planificación semanal
- **docs/adr/**: Decisiones de arquitectura
- **skills/user/**: Procedimientos vivos (opsly-bootstrap, opsly-skill-creator, etc.)

## Troubleshooting

### Hooks no se ejecutan
```bash
# Verificar configuración
git config core.hooksPath
# Debe mostrar: .claude/4-hooks

# Si no, reconfigurar:
git config core.hooksPath .claude/4-hooks
```

### Permisos de ejecución
```bash
chmod +x .claude/4-hooks/*.sh
ls -la .claude/4-hooks/*.sh  # Verificar xr-xr-x
```

### package-lock.json cambió pero no se reinstaló
```bash
# Ejecutar manualmente:
npm ci
# O verificar post-merge.sh:
bash .claude/4-hooks/post-merge.sh
```
