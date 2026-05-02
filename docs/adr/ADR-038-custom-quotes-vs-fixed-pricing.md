# ADR-038 — Custom quotes (Claude-generated) vs fixed pricing

## Estado

Aceptado (2026-05-02)

## Arquitecto

**Claude** — Decisión de modelo de ingresos y diferenciación competitiva

## Contexto

Opsly Local Services necesita modelo de pricing para diferenciarse en mercado de tech services local (donde mayoría usa fixed rates: "$99 diagnostic fee", "$150 laptop cleanup", etc).

**Escenario:**
- Gamer PC con liquid cooling RGB = diferente de rig estándar
- Office con 3 ubicaciones WiFi = más complejo que single WiFi issue
- Laptop "lento" puede ser: malware, disco lleno, o RAM saturada → precios diferentes

**Pregunta clave:** ¿Pricing fixed ("$150 gamer clean") o custom quotes por cliente?

## Alternativas Consideradas

### Opción A: Fixed catalog pricing
- Pre-define services: "Gamer PC Clean = $150", "Laptop Speed-Up = $100-200", "Office Support = $300"
- Clientes ven precio en landing page
- Quote = automático (suma servicios seleccionados + location modifier)

**Ventajas:**
- Simple, rápido, predecible
- Clientes compran sin friction

**Rechazada porque:**
- Imposible diferenciar "rig gaming $2k" vs "laptop gaming $500"
- Revenue left on table (cliente con dinero paga lo mismo que presupuesto ajustado)
- Menos conversión en office (need custom negotiation)

### Opción B: Custom quotes por cliente (Claude Ops Agent genera) ✅ **SELECCIONADA**
- Clientes submitten form con contexto: "3 office locations, WiFi dropping"
- Sales Agent triagea
- Ops Agent (Claude) escribe propuesta personalizada: "Mesh system + config = $600"
- Clientes ven "custom quote" → más percepción de valor
- Puede upsell: "Basic = $150, Recommended = $600, Enterprise = $1200"

**Ventajas:**
- Flexibilidad de precios (match customer ability-to-pay)
- Psychological: "custom quote" > "fixed price" (perceived value)
- Upselling built-in (Option A/B/C in every quote)
- Revenue upside on high-ticket customers

**Seleccionada porque:**
- Fit perfecto con Sales + Ops agent architecture
- Margin expansion: standard customer $100 → high-value $250 (same service, smarter positioning)
- Office market (recurring $$) requiere negociación

### Opción C: Hybrid (catalog + custom override)
- Mostly fixed, but Sales can override with custom quotes
- *Rechazada:* over-engineered para MVP, introduce manual decision fatigue

## Decisión

**Custom quotes para todos los servicios, generados por Ops Agent (Claude).**

### Workflow

1. **Customer submits inquiry:**
   ```
   "My office network keeps dropping. 3 locations."
   ```

2. **Sales Agent triages, sends to Ops Agent:**
   ```
   Sales Agent → Ops Agent:
   "Office WiFi issue, 3 locations, customer is business (high budget)"
   ```

3. **Ops Agent writes custom quote (2-hour SLA):**
   ```
   PROPOSAL #P-2025-001
   
   SITUATION: 3 locations, WiFi drops frequently
   ASSESSMENT: Dual-band interference + old routers
   
   OPTION A (Budget): Update firmware + optimize channels = $150
   OPTION B (Recommended): Mesh system + setup = $600
   OPTION C (Enterprise): Mesh + managed monitoring + 6mo support = $1,200
   
   Decision needed by Monday EOD.
   ```

4. **Customer chooses option, booking created, invoice issued post-service**

### No fixed service catalog

Database `local_services.services` stores metadata (category, duration estimate), NOT fixed price:

```sql
CREATE TABLE local_services.services (
  id uuid,
  name TEXT, -- "Gamer PC Clean"
  category TEXT, -- "gaming", "office", "home"
  description TEXT,
  base_price DECIMAL(10,2), -- NULL or advisory only
  duration_minutes INT,
  -- IMPORTANT: actual quote price is custom per customer, not derived from base_price
);
```

### Ops Agent Prompt Guidance

Ops Agent decision tree (in `.cursor/prompts/local-services-ops-admin.md`):

```
IF customer_budget_hints = "I need budget option" → recommend Option A
IF customer_problem_complexity = "medium" → recommend Option B (margin sweet-spot)
IF customer_type = "business" OR mentions "recurring" → recommend Option C (upsell)
```

## Consecuencias

### Positivas
- Revenue higher: standard customers $100→$150 (50% upside)
- Business customers ($300+) discoverable via quote
- Psychological value: "custom" → perceived premium service
- Upsell mechanics: every quote has A/B/C options
- Recurring potential: "maintenance plan = $99/mo" mentioned in every quote

### Negativas (mitigadas)
- **Slower sales cycle:** Quote takes 2 hours vs instant "add to cart". *Mitigación:* Sales Agent gives ETA ("Ops team will send proposal by tomorrow 2pm"), builds anticipation
- **Customer friction:** Some may want instant pricing. *Mitigación:* Landing page note: "Custom quotes in 24h" (competitive advantage message)
- **Ops Agent hallucination risk:** Claude makes bad price guess. *Mitigación:* Ops Agent has tenant pricing rules in context (range guidelines per service category)

## Notas Operacionales

### Quote Validity
All quotes: `valid_until = now() + 7 days` (auto-expire to trigger re-engagement)

### Pricing Rules (Config per Tenant)
```json
{
  "local_services_pricing": {
    "gamer_pc_clean": {
      "min": 100,
      "standard": 150,
      "premium": 250,
      "factors": ["liquid_cooling", "rgb", "rig_age"]
    },
    "office_support": {
      "min": 300,
      "per_location": 100,
      "recurring_discount": 0.15
    }
  }
}
```

Ops Agent reads these ranges, personalizes within bounds.

### Competitive Differentiation

vs local competitors (fixed "$99 diagnostic", "$150 cleaning"):
- **Your model:** "We custom-design solutions, not one-size-fits-all diagnostics"
- **Messaging:** "Let's understand YOUR setup first (free assessment call), then give you options"

## Decisiones Relacionadas

- **ADR-037:** Multi-tenant architecture (enables different pricing per tenant)
- **ADR-039:** Sales channels (email for quote delivery, WhatsApp for follow-up)
- **ADR-040:** Technician model (solo generates $5k, scaling to $10k with margin expansion via custom quotes)

## Referencias

- Ops Agent Prompt: `.cursor/prompts/local-services-ops-admin.md`
- Quote generation flow: `docs/OPSLY-LOCAL-SERVICES.md` (Agent 2 section)
- Pricing rules: `.env.local` or Doppler config per tenant
