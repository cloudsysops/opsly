# Peskids Forms Specification

All forms are mobile-first, accessible (WCAG 2.1 AA), and validation-heavy (prevent bad data early).

---

## Form 1: Lead Interest Form

**Where:** Landing page (embedded, above fold)  
**Who:** Potential parents interested in after-school program  
**Goal:** Capture contact info so Peskids can follow up  
**Post-submit:** Confirmation message + link to dashboard  

### Fields

| Field | Type | Required | Validation | Placeholder |
|-------|------|----------|-----------|-------------|
| name | text | ✅ yes | min:2, max:50, alpha+space | "Your full name" |
| email | email | ✅ yes | valid-email | "your@example.com" |
| phone | tel | ❌ optional | phone-format or empty | "(555) 123-4567" |
| class_modality | select | ✅ yes | `llanogrande` (sede) / `domicilio` | "¿Dónde prefieres la clase?" |
| neighborhood | text | ✅ yes | min:2, max:80 (barrio/zona) | "Ej. Llanogrande, Envigado…" |
| grade_interested | select | ✅ yes | enum: K–5 / 6–8 / 9–12 / Other | "Select grade..." |
| referral_source | select | ❌ optional | enum: Google / Friend / Facebook / Instagram / Other / Not sure | "How did you hear?" |

### Validation Rules

```javascript
name: {
  required: true,
  minLength: 2,
  maxLength: 50,
  pattern: /^[a-zA-Z\s'-]+$/, // letters, space, hyphen, apostrophe
  message: "Please enter a valid name"
}

email: {
  required: true,
  type: "email",
  message: "Please enter a valid email"
}

phone: {
  required: false,
  pattern: /^[0-9\-\+\(\)\s]{0,15}$/, // flexible phone format
  message: "Please enter a valid phone number"
}

grade_interested: {
  required: true,
  enum: ["K-5", "6-8", "9-12", "Other"],
  message: "Please select a grade level"
}

referral_source: {
  required: false,
  enum: ["Google", "Friend", "Facebook", "Instagram", "Other", "Not sure"]
}
```

### On Submit

```javascript
1. Validate all fields client-side
2. If validation fails: show error message above field
3. If validation passes:
  - POST to /api/leads with form data
  - Show "Sending..." loading state
  - On success:
    - Store lead in `leads` table
    - Emit event: lead.created
    - Redirect to /thanks (or show thank-you modal)
    - Show an on-screen confirmation only; any email follow-up is future/manual
  - On error:
    - Show error message: "Something went wrong. Try again."
    - Keep form filled in so user can re-submit
```

### Data Destination

**Table:** `leads`
```sql
CREATE TABLE leads (
  id UUID PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  grade_interested TEXT NOT NULL,
  referral_source TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  admin_notes TEXT
);
```

### Event

**Type:** `lead.created`  
**Payload:**
```json
{
  "event_type": "lead.created",
  "lead_id": "uuid-here",
  "tenant_id": "peskids",
  "created_at": "2026-05-20T10:15:00Z",
  "name": "Maria Rodriguez",
  "email": "maria@example.com",
  "phone": "+1-555-123-4567",
  "grade_interested": "K-5",
  "referral_source": "Friend"
}
```

### Admin Notification (Sprint 01)

- Dashboard: nueva tarjeta / fila en lista de leads (tiempo real si aplica)
- **Sin** email automático al owner en Sprint 01
- Owner abre dashboard o WhatsApp manual para contactar al padre

### Success Page

Show:
```
✓ Thank you, Maria!

We've received your interest. 
Peskids will follow up within 24 hours.

[View our programs] [Back to home]
```

---

## Form 2: Parent Feedback Form

**Where:** Dashboard (embedded tab) or emailed link  
**Who:** Parents/guardians of enrolled children  
**Goal:** Collect weekly feedback on program experience  
**Frequency:** On-demand or weekly (email with embedded form)  
**Post-submit:** Thank-you message  

### Fields

| Field | Type | Required | Validation | Notes |
|-------|------|----------|-----------|-------|
| child_name | text | ✅ yes | min:2, max:50, alpha+space | Pre-filled if coming from student record |
| satisfaction | radio | ✅ yes | 1, 2, 3, 4, or 5 | Show as 5 stars |
| suggestion | textarea | ❌ optional | max:500 chars | Placeholder: "What could we improve?" |
| contact_me | checkbox | ❌ optional | boolean | "I'd like to discuss this feedback" |

### Validation Rules

```javascript
child_name: {
  required: true,
  minLength: 2,
  maxLength: 50,
  pattern: /^[a-zA-Z\s'-]+$/,
  message: "Please enter your child's name"
}

satisfaction: {
  required: true,
  enum: [1, 2, 3, 4, 5],
  message: "Please rate your experience"
}

suggestion: {
  required: false,
  maxLength: 500,
  message: "Suggestion must be 500 characters or less"
}

contact_me: {
  required: false,
  type: "boolean"
}
```

### On Submit

```javascript
1. Validate fields
2. If valid:
   - POST to /api/feedback with form data
   - Add created_at timestamp
   - Check: if satisfaction < 3, set flag for admin review
   - Store in `feedback` table
   - Emit event: feedback.created
   - If satisfaction < 3: flag for admin review in dashboard
   - Optional alert email remains future/manual and is not part of Sprint 01
   - Show thank-you message
3. If invalid: show field errors
```

### Data Destination

**Table:** `feedback`
```sql
CREATE TABLE feedback (
  id UUID PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  child_name TEXT NOT NULL,
  satisfaction INT CHECK (satisfaction >= 1 AND satisfaction <= 5),
  suggestion TEXT,
  contact_wanted BOOLEAN DEFAULT false,
  parent_email TEXT, -- optional, from context
  created_at TIMESTAMP DEFAULT NOW(),
  admin_notes TEXT
);
```

### Event

**Type:** `feedback.created`
```json
{
  "event_type": "feedback.created",
  "feedback_id": "uuid-here",
  "tenant_id": "peskids",
  "created_at": "2026-05-20T14:30:00Z",
  "child_name": "Emma Martinez",
  "satisfaction": 5,
  "suggestion": "Love the new art program!",
  "contact_wanted": false
}
```

### Admin Alert (Sprint 01)

**If satisfaction < 3:**
- Flag en dashboard + destacar en lista de feedback
- **Sin** email automático al owner en Sprint 01
- Si `contact_wanted = true`: mostrar badge "Padre pide contacto" en detalle
- Seguimiento por WhatsApp manual según [WHATSAPP-CHANNEL.md](./WHATSAPP-CHANNEL.md)

### Success Message

```
✓ Thank you for your feedback!

Your input helps us improve the program.

[Close] [Submit another]
```

---

## Form 3: Teacher Note Form (Optional for Sprint 01)

**Where:** Dashboard (for teachers)  
**Who:** Teachers/instructors  
**Goal:** Track observations about students  
**Frequency:** As-needed  

### Fields

| Field | Type | Required | Validation |
|-------|------|----------|-----------|
| date | date | ✅ yes | not in future |
| student_name | select | ✅ yes | list of enrolled students |
| observation | textarea | ✅ yes | min:10, max:500 |
| follow_up_needed | checkbox | ❌ optional | boolean |

### On Submit
- Store in `teacher_notes` table
- Emit event: `teacher.note.created`
- If follow_up_needed: create task in followups table

### Status for Sprint 01
**DEFERRED:** Only if time allows. Focus on lead + feedback forms first.

---

## Form 4: Follow-up Update Form

**Where:** Dashboard (on follow-up detail card)  
**Who:** Admin staff  
**Goal:** Update status of follow-ups and log outcomes  
**When:** After contacting a lead or parent  

### Fields

| Field | Type | Required | Validation |
|-------|------|----------|-----------|
| status | select | ✅ yes | enum: "Completed" / "In Progress" / "Reschedule" |
| notes | textarea | ❌ optional | max:500 chars |
| next_date | date | ❌ conditional | required if status = "Reschedule" |

### On Submit
- Update `followups` table
- Emit event: `followup.completed` or `followup.rescheduled`
- Show confirmation: "Follow-up updated"
- Suggest next follow-up (if applicable)

### Status for Sprint 01
**INCLUDED:** Part of MVP (follow-up workflow)

---

## Form Styling & UX

### Visual Design
- Light background, clear labels
- Validation errors in red, above field
- Required asterisks (red) on labels
- Success checkmarks on valid fields
- Loading spinner on submit button
- Disabled submit button until all required fields filled

### Mobile
- Full-width fields
- Large tap targets (44px minimum)
- Single-column layout
- Clear spacing between fields

### Accessibility
- Labels associated with inputs (for/id)
- Error messages linked to fields (aria-describedby)
- Placeholder text is NOT a substitute for label
- Color not sole indicator of state (use icons + text)
- Keyboard-navigable (Tab through all fields)

### API Endpoints

**Lead Form:**
- POST `/api/leads` → store + emit event

**Feedback Form:**
- POST `/api/feedback` → store + emit event

**Teacher Notes:**
- POST `/api/teacher-notes` → store + emit event

**Follow-up Update:**
- PATCH `/api/followups/:id` → update + emit event

**All endpoints:**
- Require `tenant_id` (from auth context)
- Return `{ success: true, data: {...} }` or error
- Log to observability (no PII in logs)

---

## Testing Checklist

- [ ] All validation rules work (test with invalid data)
- [ ] Fields populate correctly (pre-fill from context)
- [ ] Form submits and creates database record
- [ ] Events are emitted and logged
- [ ] Success message shows after submit
- [ ] Error message shows on invalid submission
- [ ] Mobile layout looks good
- [ ] Tab navigation works (keyboard-only)
- [ ] Screen reader can access all fields
- [ ] Spam prevention (rate limiting on submit)
- [ ] XSS protection (HTML escaping)
- [ ] CSRF token validated on submit
