# ADR-040 — Technician scaling: Solo MVP (Week 1-4) → +Assistant (Week 5+)

## Estado

Aceptado (2026-05-02)

## Arquitectos

- **Claude** — Decisión operacional y revenue model
- **Codex** — Validación de arquitectura de asignación automática y portal de tecnician

## Contexto

Opsly Local Services inicia con single technician (você) generando $5k/mo. A medida que bookings escalan, bottleneck = tu disponibilidad (max ~10-15 appointments/week).

**Pregunta clave:** ¿Cómo escalar a $10k/mo sin agotamiento?

**Opción:** Contratar 1 assistant technician (Week 5+) que maneja jobs estándar ($100-200), mientras tú captures high-value jobs ($300+).

## Alternativas Consideradas

### Opción A: Solo forever (no hiring)
- Only you do all jobs
- Max capacity: 15 appointments/week @ $150 avg = $2,250/week = $9k/mo
- Limited by your time, energy, skill (some jobs out of scope)

**Rechazada porque:**
- Burnout risk (solo no scales beyond ~$10k)
- Can't take vacation or sick day
- Some jobs (enterprise office setups) need 2 people

### Opción B: Hire 2+ people (team model)
- Hire full-time technician + manager
- Build formal tech support org

**Rechazada porque:**
- Out of scope MVP (overhead kills profitability)
- Opsly Local Services proof-of-concept, not mega business
- Fixed headcount = fixed costs (risky)

### Opción C: Micro-hire 1 assistant technician (flexible, part-time) ✅ **SELECCIONADA**
- You: high-value complex jobs ($300+)
- Assistant: standard jobs ($100-200)
- Revenue split: 70/30 or commission-based
- Part-time (10-15 hrs/week) scales to full-time if hits $50k/mo later

**Seleccionada porque:**
- Simple: 2-person team < 10-person org
- Flexible: assistant paid per job (no fixed salary risk)
- Scalable: can hire 2nd, 3rd assistant as needed
- Matches Opsly multi-agent philosophy

## Decisión

**Two-tier technician model with automatic assignment logic:**

### Phase 1: Solo (Week 1-4)
- **You:** all jobs (gamer, laptop, office, simple & complex)
- **Capacity:** 10-15 jobs/week × $150-300 avg = **$5k/mo**
- **CRM:** All bookings in `local_services.bookings` with `assigned_to = NULL` (no assignment yet)

### Phase 2: +Assistant (Week 5+)

**Revenue projection:**
- **You:** high-value jobs ($300+, complex, office, recurring)
  - ~10 jobs/week = $3.5k/week = **$14k/mo (you only)**
- **Assistant:** standard jobs ($100-200, simple, gamer, laptop)
  - ~10 jobs/week, paid 30% commission = $1.5k/week = **$6k/mo (assistant take-home)**
- **Platform revenue:** $3.5k + $6k = **$9.5k/mo** ✓ (hits $10k/mo target)

### Automatic Assignment Logic

```typescript
// api/local-services/bookings/[id]/assign/route.ts

interface AssignmentRule {
  job_price: number;
  complexity: 'simple' | 'medium' | 'complex';
  service_type: 'gamer' | 'laptop' | 'office';
  recurring: boolean;
}

function assignTechnician(booking: AssignmentRule): 'you' | 'assistant' {
  // Rule 1: High-value jobs → You
  if (booking.job_price >= 300) return 'you';
  
  // Rule 2: Complex office jobs → You
  if (booking.service_type === 'office' && booking.complexity === 'complex') return 'you';
  
  // Rule 3: Recurring → You (relationship management)
  if (booking.recurring) return 'you';
  
  // Rule 4: Standard jobs → Assistant (if available)
  if (booking.job_price < 200 && booking.complexity !== 'complex') return 'assistant';
  
  // Rule 5: Fallback → You (default if assistant busy or doesn't match)
  return 'you';
}
```

### Technician Portal (Week 5)

Create `/apps/local-services/app/tech/` for assistant + you:

```typescript
// apps/local-services/app/tech/dashboard/page.tsx

interface TechnicianDashboard {
  todaySchedule: Booking[]; // filtered by assigned_to = currentUser.id
  earnings: {
    weekly: number;
    monthly: number;
    pending_invoices: number;
  };
  jobsAvailable: number; // unassigned bookings you could grab
  ratings: number; // avg customer rating (5-star)
}
```

**Features:**
- View today's appointments
- Mark as "en_route" / "completed"
- Upload service photos
- Auto-generate service report (Claude writes description)
- View earnings (weekly, monthly, per-job breakdown)
- Rating summary

### Compensation Model (Week 5)

**Option A: Flat commission**
```
Assistant: 30% of booking revenue
Example: $150 job → assistant gets $45
```

**Option B: Tiered commission (performance-based)**
```
1-10 jobs/week:   25% commission
11-20 jobs/week:  28% commission  
20+ jobs/week:    30% commission (high performer bonus)
```

**Recommended:** Option A (Week 5) → Option B (Week 8+)

**Payment:** Weekly via Stripe Connect or direct transfer

## Consecuencias

### Positivas
- **Capacity growth:** 10-15 → 20-25 jobs/week without burnout
- **Revenue expansion:** $5k → $10k/mo
- **Flexibility:** Assistant paid per job (no fixed salary overhead)
- **Quality:** You handle complex/strategic, assistant handles repetitive (better outcomes)
- **Scaling:** Model replicates (hire 3rd assistant if needed)

### Negativas (mitigadas)
- **Training overhead:** Assistant needs onboarding (2-3 jobs shadowing). *Mitigación:* Schedule Week 4 for training
- **Quality variance:** Assistant may deliver differently than you. *Mitigación:* Standard process docs + customer feedback loop
- **Communication tax:** Assigning jobs adds complexity. *Mitigación:* Automatic assignment rules (code does it)
- **Customer preference:** Some customers want YOU specifically. *Mitigación:* Flag "author_preference = true" in booking, always assign to you

## Notas Operacionales

### Week 4-5: Assistant Onboarding
- Interview 3-5 local tech candidates
- Hire by end of Week 4
- Week 5: Shadowing (you + assistant on 3-5 jobs together)
- Week 6: Assistant takes lead on 5-10 standard jobs

### Booking Workflow Updates (Week 5)

```
Customer books appointment
  ↓
Ops Agent generates custom quote
  ↓
Booking created (status: pending, assigned_to: NULL)
  ↓
**NEW:** Assignment rule evaluates job_price, complexity, service_type
  ↓
Auto-assigned to you OR assistant based on rules
  ↓
Email sent to assigned technician:
  "New booking: [customer], [service], [address], Thursday 2pm"
  ↓
Technician confirms availability (accept/decline in portal)
  ↓
If declined → reassign or offer to other technician
```

### CRM Tracking (Week 5)

Add to `local_services.bookings` table:
```sql
ALTER TABLE local_services.bookings ADD COLUMN assigned_to UUID REFERENCES auth.users;
ALTER TABLE local_services.bookings ADD COLUMN assignment_rule TEXT; -- "high_value", "assistant", "customer_preference"
ALTER TABLE local_services.bookings ADD COLUMN assignment_timestamp TIMESTAMPTZ;
```

### Revenue Tracking (Dashboard)

Admin dashboard shows:
- **Total platform revenue:** $X/mo
- **Your jobs:** $Y/mo (commission-free)
- **Assistant jobs:** $Z/mo (you collect revenue, pay assistant commission)
- **Assistant earnings:** $Z * 0.30 (what they earned)
- **Your margin:** $Y + ($Z * 0.70)

### Expansion (Week 8+)

Once $10k/mo sustained:
- **Option 1:** Hire 2nd assistant (scale to $15k/mo)
- **Option 2:** Hire assistant manager (manage scheduling, training)
- **Option 3:** Build service product: $99/mo maintenance plan → passive recurring

## Decisiones Relacionadas

- **ADR-037:** Multi-tenant (each tenant manages their own technician team)
- **ADR-038:** Custom quotes (pricing varies by service complexity / technician)
- **ADR-039:** Sales channels (booking volume drives assignment load)

## Referencias

- Tech Builder Prompt: `.cursor/prompts/local-services-tech-builder.md` (build assignment API + technician portal)
- Technician Portal: `apps/local-services/app/tech/` (create Week 5)
- Assignment rules: `lib/repositories/booking-assignment.ts`
- CRM module: `apps/api/app/api/local-services/assignment/route.ts`
