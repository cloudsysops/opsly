# Opsly — Visión y Objetivos

## Qué es Opsly

Plataforma multi-tenant SaaS que despliega y gestiona stacks de agentes
autónomos (n8n, Uptime Kuma) por cliente, con facturación Stripe,
backups automáticos y dashboard de administración global.

## Para quién

Agencias digitales y equipos de operaciones que necesitan:

- Automatización de procesos sin gestionar infraestructura
- Monitoreo de uptime para sus clientes
- Facturación recurrente con planes diferenciados
- Dashboard unificado para operar múltiples clientes

## Planes

| Plan | Precio | Incluye |
|------|--------|---------|
| Startup | $49/mes | n8n + Uptime Kuma, 1 dominio |
| Business | $149/mes | Todo Startup + backups diarios, soporte |
| Enterprise | Custom | Multi-región, SLA, onboarding dedicado |

## Primer cliente real

- Tenant: smiletripcare
- Plan: Startup
- Dominio: ops.smiletripcare.com
- Propósito: validar el stack completo en producción

## Stack transferible desde smiletripcare

(Extraído de `.vscode/extensions.json` y `package.json` del proyecto origen)

### Extensiones VS Code / Cursor

- dbaeumer.vscode-eslint
- esbenp.prettier-vscode
- bradlc.vscode-tailwindcss
- ms-vscode.vscode-typescript-next
- eamodio.gitlens
- usernamehw.errorlens
- Supabase.vscode-supabase-extension
- YoavBls.pretty-typescript-errors
- rangav.vscode-thunder-client
- Gruntfuggly.todo-tree

### Paquetes npm core

- next, react, react-dom, typescript
- @supabase/supabase-js, @supabase/ssr
- zod, stripe
- @sentry/nextjs, @logtail/next
- tailwindcss, @tailwindcss/postcss
- eslint, prettier, husky, lint-staged
- vitest, @playwright/test

### Patrón middleware

Next.js + Supabase Auth = @supabase/ssr + `NEXT_PUBLIC_SUPABASE_*` en `.env`

## Objetivos por fase

### Fase 1 — Validación (AHORA)

- [ ] Deploy completo en staging (ops.smiletripcare.com)
- [ ] Primer tenant smiletripcare corriendo
- [ ] n8n accesible en n8n.smiletripcare.ops.smiletripcare.com
- [ ] Uptime Kuma accesible
- [ ] Stripe webhook funcionando
- [ ] Backup automático corriendo

### Fase 2 — Producto

- [ ] Onboarding self-service (cliente paga → tenant se despliega solo)
- [ ] Dashboard admin operativo
- [ ] Emails transaccionales (Resend)
- [ ] Alertas Discord funcionando

### Fase 3 — Escala

- [ ] Segundo cliente real
- [ ] Sistema de memoria Redis + n8n → MCP → Claude
- [ ] Multi-región
- [ ] Documentación pública

## Decisión de arquitectura central

Cada tenant es un docker-compose aislado.
No Kubernetes, no Swarm. Simplicidad operativa sobre escala teórica.
Escalar = más VPS, no más complejidad.

## Lo que un agente NUNCA debe hacer

- Proponer migrar a Kubernetes o Swarm
- Hardcodear secrets (todo va a Doppler)
- Usar `any` en TypeScript
- Crear scripts no idempotentes
- Tomar decisiones de arquitectura sin documentarlas en AGENTS.md

## Roadmap por fases (revisado 2026-04-04)

### Fase 1 — Validación (AHORA, máx 1 semana)

Objetivo: un tenant real corriendo en producción.

- [ ] validate-config.sh verde
- [ ] vps-bootstrap.sh sin errores
- [ ] curl https://api.ops.smiletripcare.com/api/health → 200
- [ ] tenant smiletripcare: n8n + Uptime Kuma accesibles
- [ ] Stripe webhook recibiendo eventos
- [ ] Backup automático corriendo

### Fase 2 — Producto (post-validación)

Objetivo: onboarding sin intervención manual.

- [ ] Stripe → webhook → tenant desplegado automáticamente
- [ ] Dashboard admin operativo
- [ ] Redis memory layer para contexto de agentes
- [ ] Emails transaccionales (Resend)
- [ ] Segundo cliente real

### Fase 3 — Escala (cuando Fase 2 esté estable)

Objetivo: plataforma que vende sola.

- [ ] Self-service completo
- [ ] Observabilidad: métricas por tenant
- [ ] Vector DB para memoria semántica de agentes
- [ ] API docs públicas
- [ ] Multi-VPS si el primero no alcanza

### Nunca (decisiones fijas)

- Kubernetes
- Docker Swarm
- Migrar de Traefik
- Migrar de Supabase

## Regla para agentes

Antes de proponer cualquier feature nuevo, verificar:
¿Tenants en producción > 0? Si no → volver a Fase 1.
