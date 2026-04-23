# Diagramas Mermaid — Billing USD (Opsly)

> **Alcance:** sistema actual en **USD** (sin wallet prepago). Wallet prepago: pausado según [ADR-030](adr/ADR-030-prepaid-token-wallet-roadmap.md) y [WALLET-PREPAID-ROADMAP](WALLET-PREPAID-ROADMAP.md).  
> **UI admin:** `/costs` usa `BudgetAlertCard`, `LlmBudgetSummaryStrip`, `TenantBudgetBars` y datos de `GET /api/admin/costs` (incl. `tenant_budgets`, `llm_budget_summary`).  
> **Umbrales UI:** 75% warning, 90% critical (`budget-thresholds.ts`). El enforcement de suspensión sigue la lógica de `checkTenantBudget` y políticas de tenant.

---

## 1. Arquitectura actual USD

```mermaid
flowchart TB
    subgraph Users["Clientes"]
        Tenant1["Tenant: ejemplo"]
        Tenant2["Tenant: ejemplo"]
    end

    subgraph BillingSystem["Sistema billing USD"]
        direction TB

        subgraph Payments["Pagos"]
            Stripe["Stripe API"]
            Webhook["Webhook /api/webhooks/stripe"]
            Checkout["Checkout /api/checkout/session"]
        end

        subgraph Tracking["Tracking"]
            UsageEvents["usage_events / billing_usage"]
            Meter["Medición LLM Gateway"]
            Repository["BillingUsageRepository"]
        end

        subgraph Enforcement["Enforcement"]
            BudgetEnforcer["checkTenantBudget / budget-enforcer"]
            Thresholds["Umbrales UI 75% / 90%"]
            OverLimit["Sobre límite / suspensión según política"]
        end

        subgraph Dashboards["Dashboards"]
            AdminCosts["Admin /costs"]
            PortalBudget["Portal .../budget"]
            Alerts["Alertas en UI admin"]
        end
    end

    subgraph Workers["Workers"]
        Orchestrator["Orchestrator"]
        LLMGateway["LLM Gateway"]
    end

    Tenant1 --> Checkout
    Tenant2 --> Checkout
    Checkout --> Stripe
    Stripe --> Webhook
    Webhook --> Repository

    Workers --> UsageEvents
    UsageEvents --> Meter
    Meter --> Repository

    Repository --> BudgetEnforcer
    BudgetEnforcer --> Thresholds
    BudgetEnforcer --> OverLimit

    Repository --> AdminCosts
    Repository --> PortalBudget
    Thresholds --> Alerts

    style BillingSystem fill:#e1f5fe
    style Enforcement fill:#fff3e0
    style Dashboards fill:#e8f5e9
```

---

## 2. Flujo de pago y uso (referencia)

```mermaid
sequenceDiagram
    participant C as Cliente
    participant P as Portal
    participant S as Stripe
    participant B as API / billing
    participant W as Workers / Gateway
    participant E as Budget check

    Note over C,E: Flujo de pago (suscripción / checkout)
    C->>P: Checkout / plan
    P->>S: Crear checkout session
    S->>C: Redirigir a Stripe
    C->>S: Completar pago
    S->>B: Webhook Stripe
    B->>B: Actualizar estado suscripción / tenant

    Note over C,E: Flujo de uso LLM
    C->>W: Petición vía producto
    W->>E: Medición / presupuesto según ruta

    alt Dentro de límite mensual USD
        E-->>W: Continuar
        W->>W: Ejecutar
        W->>B: Registrar uso en repositorio / eventos
    else Umbrales altos 75% / 90%
        E-->>W: Continuar (alertas en dashboard)
        B->>C: Visibilidad en portal/admin
    else Sobre presupuesto según política
        E-->>W: Bloqueo / suspensión si aplica
        W-->>C: Error o tenant suspendido
    end
```

---

## 3. Admin `/costs` y API (implementado)

```mermaid
graph TB
    subgraph AdminDashboard["Admin Dashboard"]
        CostsPage["/costs"]

        subgraph NewComponents["Componentes añadidos"]
            AlertCard["BudgetAlertCard"]
            SummaryStrip["LlmBudgetSummaryStrip"]
            BudgetBars["TenantBudgetBars"]
        end

        subgraph ExistingComponents["Componentes existentes"]
            CostsCard["CostCard catálogo"]
        end
    end

    subgraph APIEndpoints["API"]
        CostsAPI["GET /api/admin/costs extendido"]
        BudgetAPI["GET .../portal/tenant/slug/budget"]
    end

    subgraph Backend["Backend"]
        Payload["buildAdminCostsPayloadAsync"]
        Overview["fetchTenantBudgetOverview"]
        Check["checkTenantBudget"]
        Thresholds["budget-thresholds 75/90"]
    end

    CostsPage --> AlertCard
    CostsPage --> SummaryStrip
    CostsPage --> BudgetBars
    CostsPage --> CostsCard

    AlertCard --> CostsAPI
    SummaryStrip --> CostsAPI
    BudgetBars --> CostsAPI

    CostsAPI --> Payload
    Payload --> Overview
    Overview --> Check
    Check --> Thresholds

    BudgetAPI --> Check

    style NewComponents fill:#4CAF50,color:#fff
```

---

## 4. Presupuesto: zonas y umbrales (UI)

```mermaid
flowchart LR
    subgraph Usage["Uso vs límite mensual"]
        U0["0%"]
        U50["50%"]
        U75["75%"]
        U90["90%"]
        U100["100%+"]
    end

    subgraph Zones["Zonas"]
        Green["Verde: OK"]
        Yellow["Amarillo: warning"]
        Orange["Naranja: crítico"]
        Red["Rojo: sobre límite"]
    end

    subgraph Actions["Acciones típicas"]
        A1["Operación normal"]
        A2["Alerta UI warning"]
        A3["Alerta UI critical"]
        A4["Enforcement según política"]
    end

    U0 --> Green
    U50 --> Green
    Green --> A1

    U75 --> Yellow
    Yellow --> A2

    U90 --> Orange
    Orange --> A3

    U100 --> Red
    Red --> A4

    style Green fill:#4CAF50,color:#fff
    style Yellow fill:#FFC107,color:#000
    style Orange fill:#FF9800,color:#fff
    style Red fill:#f44336,color:#fff
```

---

## 5. Sistema de alertas (orientativo)

> Los canales Email/Discord masivos no están todos cableados en el diagrama de producto; el admin `/costs` muestra alertas por tenant. Discord puede usarse en flujos operativos aparte.

```mermaid
flowchart TB
    subgraph Triggers["Triggers"]
        T2["Uso >= 75%"]
        T3["Uso >= 90%"]
        T4["Sobre límite / política"]
    end

    subgraph Alerts["Niveles"]
        Warning["WARNING"]
        Critical["CRITICAL"]
        Block["Bloqueo / suspensión"]
    end

    subgraph Channels["Canales posibles"]
        Dashboard["Dashboard admin"]
        Portal["Portal cliente"]
        Discord["Discord ops"]
    end

    T2 --> Warning
    T3 --> Critical
    T4 --> Block

    Warning --> Dashboard
    Critical --> Dashboard
    Critical --> Portal
    Block --> Portal
    Block --> Discord

    style Warning fill:#FF9800,color:#fff
    style Critical fill:#f44336,color:#fff
    style Block fill:#9C27B0,color:#fff
```

---

## 6. USD actual vs wallet prepago

```mermaid
flowchart TB
    subgraph Current["Sistema actual USD"]
        direction TB
        C1["USD como unidad"]
        C2["Stripe"]
        C3["budget-enforcer + tenant_budgets"]
        C4["Sin saldo prepago tipo wallet"]
        C5["En producción incremental"]
    end

    subgraph Future["Wallet prepago roadmap"]
        direction TB
        F1["Tokens / créditos"]
        F2["Ledger inmutable"]
        F3["Contabilidad"]
        F4["Impuestos"]
        F5["Pausado ADR-017"]
    end

    subgraph Prereq["Prerrequisitos"]
        P1["Contabilidad"]
        P2["Impuestos"]
        P3["Conciliación Stripe"]
        P4["Marco legal"]
        P5["Reembolsos"]
    end

    Current -->|"Mejorar UX USD"| Current
    Prereq -->|"Antes de wallet"| Future

    style Current fill:#4CAF50,color:#fff
    style Future fill:#FF9800,color:#fff
    style Prereq fill:#9E9E9E,color:#fff
```

---

## 7. Flujo de datos (alto nivel)

```mermaid
flowchart LR
    subgraph Input["Entrada"]
        Tenant["Peticiones tenant"]
        Worker["Workers / jobs"]
    end

    subgraph Processing["Procesamiento"]
        Meter["Medición uso"]
        Repository["Repositorio billing"]
        Enforcer["checkTenantBudget"]
    end

    subgraph Storage["Persistencia"]
        DB[(Supabase platform)]
    end

    subgraph Output["Salida"]
        Dashboard["Admin / Portal"]
        Alerts["Alertas UI"]
        Decisions["Suspensión / allow"]
    end

    Tenant --> Meter
    Worker --> Meter

    Meter --> Repository
    Repository --> DB

    DB --> Enforcer
    Enforcer --> Decisions
    Enforcer --> Dashboard
    Enforcer --> Alerts

    style Decisions fill:#4CAF50,color:#fff
    style Alerts fill:#FF5722,color:#fff
```

---

## 8. Timeline ilustrativo

> Planificación de ejemplo; el calendario real está en sprints y `AGENTS.md`.

```mermaid
gantt
    title Mejoras USD budget (ilustrativo)
    dateFormat  YYYY-MM-DD

    section Documentación
    Wallet roadmap doc           :a1, 2026-04-12, 1d

    section Admin
    Componentes /costs           :b1, 2026-04-12, 2d

    section API
    GET /api/admin/costs extendido :c1, 2026-04-12, 2d

    section Backend
    budget-thresholds            :d1, 2026-04-12, 1d

    section Testing
    Tests unitarios              :e1, 2026-04-12, 2d
```

---

## 9. Componentes UI en `/costs`

```mermaid
graph TB
    subgraph AdminApp["Admin App"]
        Layout["Layout"]

        subgraph CostsPage["/costs"]
            Title["Título + resumen catálogo"]

            subgraph Summary["Resumen LLM USD"]
                S1["LlmBudgetSummaryStrip"]
            end

            subgraph Alerts["Alertas"]
                A1["BudgetAlertCard"]
            end

            subgraph Bars["Uso vs límite"]
                B1["TenantBudgetBars"]
            end

            subgraph Catalog["Catálogo costos"]
                Services["CostCard servicios"]
            end
        end
    end

    Layout --> CostsPage
    CostsPage --> Title
    CostsPage --> Summary
    CostsPage --> Alerts
    CostsPage --> Bars
    CostsPage --> Catalog

    style Summary fill:#E3F2FD
    style Alerts fill:#FFF3E0
    style Bars fill:#E8F5E9
```

---

## 10. Estado del sistema (orientativo)

```mermaid
pie title Billing USD — visión aproximada
    "Core Stripe + usage" : 45
    "Budget + admin /costs" : 35
    "Roadmap wallet ADR-017" : 20
```

---

## Referencias

- [ADR-030 — Wallet prepago](adr/ADR-030-prepaid-token-wallet-roadmap.md)
- [WALLET-PREPAID-ROADMAP.md](WALLET-PREPAID-ROADMAP.md)
- [TOKEN-BILLING-SYSTEM.md](TOKEN-BILLING-SYSTEM.md)
- Código: `apps/api/lib/billing/budget-thresholds.ts`, `admin-costs-tenant-budgets.ts`, `apps/admin/app/costs/page.tsx`
