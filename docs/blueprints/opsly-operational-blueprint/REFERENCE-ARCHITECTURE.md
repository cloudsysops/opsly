---
status: draft
owner: architecture
last_review: 2026-05-19
---

# Opsly Operational Blueprint — Reference Architecture

Arquitectura de **referencia**, no despliegue obligatorio. Cada capa es **opcional y sustituible**.

## Vista por capas

```mermaid
flowchart TB
  subgraph entry[Entry layer]
    WEB[Landing / web]
    FORM[Forms]
    SOC[Social links]
    WAin[WhatsApp inbound manual]
  end

  subgraph data[Data layer]
    PG[(Supabase / Postgres)]
    STOR[Object storage]
    EXP[CSV exports]
  end

  subgraph auto[Automation layer]
    N8N[n8n workflows]
    WH[Webhooks]
    CRON[Scheduled jobs]
  end

  subgraph conv[Conversational layer]
    JEL[Jelou / WhatsApp API]
    META[Meta channels]
  end

  subgraph ai[AI layer]
    GW[LLM Gateway / routed APIs]
    OLL[Ollama local optional]
  end

  subgraph dash[Dashboard layer]
    NEXT[Next.js app]
    VER[Vercel / hosting]
    ADM[Admin views]
  end

  subgraph control[Control plane — Opsly]
    OPS[Opsly API / portal]
    MC[Mission Control / monitoring]
    INC[Tenant incubation]
  end

  subgraph clientplat[Client platform layer — future]
    REPO[Independent repo]
    DDOM[Client domain]
    CDB[(Client-owned DB)]
  end

  entry --> auto
  auto --> data
  conv --> auto
  ai -.->|drafts only| auto
  dash --> data
  control --> auto
  control --> dash
  clientplat --> data
  clientplat -.->|optional events| control
```

## Capas (definición)

### Entry layer

**Qué:** primer contacto del mercado con el negocio.

| Elemento | Herramientas típicas | Notas |
|----------|---------------------|--------|
| Web / landing | Vercel, Webflow, WordPress | Formulario → webhook |
| Forms | Tally, Typeform, nativo | Evitar 5 formularios distintos |
| Social | Instagram, Facebook | Enlaces en bio; no automatizar DMs en MVP |
| WhatsApp | Manual → luego Jelou | No API en MVP salvo acuerdo explícito |

### Data layer

**Qué:** sistema de registro para leads, clientes, feedback, operaciones.

| Elemento | Default PyME | Alternativa |
|----------|--------------|-------------|
| DB | Supabase | Postgres managed, Neon |
| Auth | Supabase Auth | Clerk, Auth0 (si justificado) |
| Files | Supabase Storage / Drive | S3-compatible |
| Export | SQL + CSV scheduled | Derecho del cliente |

### Automation layer

**Qué:** conecta entradas, notificaciones y reportes sin código pesado.

| Elemento | Default incubación Opsly | Riesgo |
|----------|-------------------------|--------|
| n8n self-hosted en VPS tenant | Alto valor, costo ops | Medio |
| Webhooks | Bajo acoplamiento | Bajo |
| Cron semanal | Reportes | Bajo |

### Conversational layer

**Qué:** mensajería bidireccional (post-MVP típico).

- Jelou, WhatsApp Cloud API, o CRM conversacional (GoHighLevel) según [PROVIDER-MATRIX.md](./PROVIDER-MATRIX.md).
- Siempre **approval-first** para salientes.

### AI layer

**Qué:** resúmenes, borradores, clasificación sugerida.

- En incubación Opsly: LLM Gateway + `tenant_slug` + política documentada.
- Ollama local para costo $0 en tareas simples (worker Mac / opslyquantum).
- **No** es cerebro autónomo del negocio.

### Dashboard layer

**Qué:** lo que el dueño y equipo ven cada día.

- Next.js + Tailwind en Vercel (patrón recomendado post-extracción).
- En incubación: portal Opsly + hojas + n8n UI según fase.

### Control plane (Opsly)

**Qué:** plataforma que hospeda tenants, monitoreo y gobernanza.

- Compose por tenant (`tenant_<slug>`)
- Traefik, API, orchestrator (sin que el cliente dependa de él para operar)
- Mission Control / health / costos orientativos

### Client platform layer (futuro)

**Qué:** producto con marca y dominio del cliente.

- Repo independiente, Supabase propio, deploy propio
- Webhooks opcionales a Opsly

## Flujo de datos (MVP típico)

```mermaid
sequenceDiagram
  participant U as Usuario final
  participant E as Entry form
  participant N as n8n
  participant D as Database
  participant O as Owner dashboard

  U->>E: Envía interés / feedback
  E->>N: Webhook
  N->>D: Persiste lead/feedback
  N->>O: Notifica (email/Discord)
  O->>O: Revisa y actúa (humano)
```

## Despliegue físico (incubación Opsly)

```mermaid
flowchart LR
  subgraph vps[VPS Opsly]
    T[tenant_slug compose]
    N8N[n8n]
    UK[Uptime]
  end
  subgraph saas[SaaS]
    SB[Supabase futuro]
    VC[Vercel futuro]
  end
  Internet --> vps
  saas -.->|post-extraction| Internet
```

## Relación con documentación tenant

Por cliente incubado: `docs/tenants/<slug>/` implementa este blueprint (ej. [Peskids](../../tenants/peskids/ARCHITECTURE.md)).
