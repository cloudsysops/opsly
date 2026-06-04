# Academy Growth Blueprint - GHL Import Package

## Brand Reference

Use the provided ICSO brand image as the visual reference for the snapshot package.

### Brand direction

- Brand name: `IntCloudSysOps`
- Short brand: `ICSO`
- Positioning: `Business Growth & Automation Agency`
- Primary tagline: `Grow. Automate. Scale.`
- Secondary tagline: `From Leads to Revenue.`
- Mission: `We help businesses capture leads, automate follow-ups, and gain visibility into their operations.`

### Visual system

- Dark: `#0A0A0A`
- Primary Blue: `#2563EB`
- Cyan: `#06B6D4`
- Purple accent: `#8B5CFF`
- Success Green: `#22C55E`
- Light: `#F3F4F6`
- Typography: `Poppins`, fallback `Inter`, fallback `system sans-serif`

### Brand usage notes

- Use dark backgrounds with blue/cyan highlights
- Use green only for success / positive status
- Use purple as accent, not primary CTA
- Keep UI clean, high contrast, and executive-facing

## 1. Pipeline Exact

### Pipeline name

`Academy Growth Pipeline`

### Stages

| # | Stage | Description | Objective | Entry criteria | Exit criteria |
|---|---|---|---|---|---|
| 1 | New Lead | A new inquiry has been captured from form, call, message, or manual import. | Record the lead and start response timing. | Contact created or form submitted. | Lead has been acknowledged or assigned for follow-up. |
| 2 | Contacted | The team has reached out at least once. | Confirm human contact and avoid silent leads. | First outbound SMS, call, email, or message logged. | Lead replies, books a trial, or is marked lost. |
| 3 | Interested | The lead has shown intent to evaluate the program. | Qualify the lead for a trial class. | Lead confirms interest, asks for info, or requests schedule. | Trial is scheduled or lead becomes unqualified. |
| 4 | Trial Class Scheduled | Trial class date/time is booked. | Lock the trial on calendar and prevent no-shows. | Trial date exists and calendar slot is assigned. | Trial is completed, rescheduled, or canceled. |
| 5 | Trial Class Completed | The trial session happened. | Capture post-trial conversion action. | Trial marked as attended/completed. | Enrollment is pending, enrolled, or lost. |
| 6 | Enrollment Pending | Family wants to enroll but has not completed signup/payment. | Push to close the enrollment gap quickly. | Post-trial interest confirmed. | Enrollment completed or explicitly lost. |
| 7 | Active Student | Enrollment is complete and the student is active. | Track ongoing revenue and retention. | Enrollment complete and first class active. | Student becomes inactive, canceled, or renewal pending. |
| 8 | Lost | Lead will not convert in the current cycle. | Stop active follow-up and preserve reporting. | No interest, no response, no fit, or closed lost. | Re-opened by new inquiry or re-engagement. |

## 2. Tags

### Final nomenclature

| Tag | Usage |
|---|---|
| `academy_lead` | Generic academy lead marker |
| `academy_trial` | Lead is trial-class qualified |
| `academy_parent` | Parent / guardian contact context |
| `academy_student` | Student record context |
| `academy_active` | Enrolled and active student |
| `academy_lost` | Closed lost / no longer pursuing |
| `academy_referral` | Lead came from referral |
| `academy_instagram` | Lead source Instagram |
| `academy_facebook` | Lead source Facebook |
| `academy_website` | Lead source website |
| `academy_whatsapp` | Lead source WhatsApp |

### Tag rules

- Apply one source tag per lead whenever possible
- Apply `academy_trial` when trial class is booked
- Apply `academy_active` only after enrollment is complete
- Apply `academy_lost` when follow-up should stop

## 3. Custom Fields

| Field Name | Field Type | Required | Usage |
|---|---|---:|---|
| Student Name | Single line text | Yes | Name of the student attending the program |
| Parent Name | Single line text | Yes | Parent or guardian contact name |
| Student Age | Number | Yes | Age of the student |
| Program Interest | Dropdown | Yes | Program or class interest |
| Preferred Schedule | Single line text | Yes | Preferred class schedule |
| Trial Class Date | Date / time | No | Trial session date and time |
| Enrollment Date | Date | No | Date enrollment was completed |
| Lead Source | Dropdown | Yes | Source channel |
| Source Detail | Single line text | No | Extra source context, UTM, or note |

### Suggested dropdown values

**Program Interest**

- Beginner
- Intermediate
- Advanced
- Exam Prep
- Private Class
- Group Class

**Lead Source**

- Instagram
- Facebook
- Website
- Referral
- WhatsApp
- Google Business

## 4. Forms

### Free Trial Form

#### Exact fields

| Field | Required | Validation |
|---|---:|---|
| Nombre | Yes | Min 2 characters |
| Teléfono | Yes | Must be valid phone format |
| Email | Yes | Must be valid email |
| Edad | Yes | Number, min 1, max 120 |
| Programa | Yes | Must match available program options |
| Horario Preferido | Yes | Min 2 characters |
| Consentimiento | Yes | Must be checked |

#### Recommended helper text

- Nombre: `Nombre del padre/madre o tutor`
- Teléfono: `Incluye código de área`
- Email: `Usaremos este correo para el seguimiento`
- Edad: `Edad del estudiante`
- Programa: `Selecciona el programa de interés`
- Horario Preferido: `Indica el horario que mejor te conviene`
- Consentimiento: `Acepto ser contactado por el equipo de la academia`

#### Success message

`Gracias. Hemos recibido tu solicitud. Nuestro equipo te contactará pronto para coordinar tu clase de prueba.`

## 5. Workflows

### Workflow 01 - Lead Intake

**Trigger**

- Form Submitted

**Actions**

1. Create / update contact
2. Create opportunity in `Academy Growth Pipeline`
3. Set stage to `New Lead`
4. Apply source tag
5. Apply `academy_lead`
6. Populate custom fields
7. Send welcome SMS
8. Send welcome email
9. Notify team

**Delays**

- Immediate notification
- Optional 10 minute internal reminder if no manual assignment occurs

**Notifications**

- Team inbox
- Owner / admin notification

### Workflow 02 - Trial Reminder

**Trigger**

- Trial Class Date is scheduled

**Actions**

1. Send reminder 24h before
2. Send reminder 3h before
3. Send reminder 30 min before
4. Notify team if trial is at risk of no-show

**Delays**

- 24 hours before
- 3 hours before
- 30 minutes before

**Notifications**

- SMS to parent
- Email to parent if email is present

### Workflow 03 - Post Trial Follow Up

**Trigger**

- Trial class completed

**Actions**

1. Move opportunity to `Enrollment Pending`
2. Send thank-you email
3. Send follow-up SMS
4. Offer enrollment next step
5. Notify team for human follow-up

**Delays**

- Same day thank-you
- Follow-up after 24h if no response
- Follow-up after 72h if still no response

**Notifications**

- Internal alert for high-intent leads

### Workflow 04 - Enrollment Success

**Trigger**

- Enrollment completed

**Actions**

1. Move opportunity to `Active Student`
2. Apply `academy_active`
3. Remove or supersede trial-only tags where needed
4. Send welcome email
5. Send welcome SMS
6. Notify team

**Delays**

- Immediate welcome

**Notifications**

- Team inbox
- Owner / admin notification

## 6. Email Templates

### Welcome Email

**Subject:** Welcome to {{company_name}} - your trial class is next

Hi {{parent_name}},

Thanks for reaching out to {{company_name}}.

We received your request for {{program_interest}} for {{student_name}}.

Our team will contact you shortly to confirm the best time for your trial class and answer any questions you may have.

If you want to move faster, reply to this email or call us at {{company_phone}}.

We are excited to help {{student_name}} get started.

Best,
{{company_name}} Team

### Trial Reminder Email

**Subject:** Reminder: your trial class is coming up

Hi {{parent_name}},

This is a friendly reminder that {{student_name}} has a trial class scheduled for {{trial_class_date}}.

Please arrive a few minutes early so we can get everything ready.

If you need to reschedule, reply to this email as soon as possible and we will help you find another time.

See you soon,
{{company_name}} Team

### Enrollment Email

**Subject:** Welcome to {{company_name}} - enrollment confirmed

Hi {{parent_name}},

Great news. {{student_name}} is now enrolled with {{company_name}}.

We are glad to have you with us and we are ready to support the next step in the learning journey.

If you have any questions about schedule, materials, or next classes, just reply to this email.

Welcome aboard,
{{company_name}} Team

### Re-engagement Email

**Subject:** Still interested in joining {{company_name}}?

Hi {{parent_name}},

We wanted to follow up and see if you are still interested in a trial class for {{student_name}}.

We would love to help you find the best schedule and program fit.

If now is not the right time, no problem. Reply whenever you are ready and we will pick things up from there.

Best,
{{company_name}} Team

## 7. SMS Templates

### Welcome SMS

`Hi {{parent_name}}, thanks for contacting {{company_name}}. We received your request for {{student_name}} and will reach out soon to confirm the trial class.`

### Trial Reminder SMS

`Reminder from {{company_name}}: {{student_name}} has a trial class on {{trial_class_date}}. Reply here if you need to reschedule.`

### Enrollment SMS

`Great news {{parent_name}} - {{student_name}} is now enrolled at {{company_name}}. Welcome aboard.`

### Re-engagement SMS

`Hi {{parent_name}}, just checking in to see if you are still interested in a trial class for {{student_name}}. Reply when ready.`

## 8. Dashboard Mapping

| Metric | Definition | Source |
|---|---|---|
| Leads | Count of new contacts created in the selected period | Contact created date / opportunity created date |
| Trials | Count of opportunities in `Trial Class Scheduled` or `Trial Class Completed` | Pipeline stage |
| Enrollments | Count of opportunities moved to `Active Student` | Pipeline stage and enrollment tag |
| Active Students | Count of contacts tagged `academy_active` or staged as `Active Student` | Tag + pipeline stage |
| Conversion Rate | Enrollments divided by total leads | Calculated from leads and enrollments |
| Lead Sources | Breakdown by source tag or source field | Lead source tag / custom field |
| Revenue | Sum of paid enrollments or active recurring value, depending on account setup | Opportunity value, closed won, or payment record |

### Recommended dashboard formula notes

- Keep revenue aligned to GHL opportunity values or payment records already in use
- Do not add extra metrics beyond the executive v0 set
- Use the same dashboard widgets across all academy snapshots

## 9. Snapshot Checklist

### Required objects

- Pipeline: `Academy Growth Pipeline`
- Tags: all academy tags listed above
- Custom Fields: all fields listed above
- Form: `Free Trial Form`
- Calendars: trial class calendar, follow-up schedule if used
- Workflows: Lead Intake, Trial Reminder, Post Trial Follow Up, Enrollment Success
- Templates: welcome, reminder, enrollment, re-engagement
- Dashboards: executive dashboard widgets
- Branding: ICSO brand applied where applicable

### Export readiness checklist

- [ ] Pipeline stages created exactly as specified
- [ ] Tags created with final naming
- [ ] Custom fields created and mapped
- [ ] Form validated end to end
- [ ] Workflow triggers tested
- [ ] Email templates rendered correctly
- [ ] SMS templates reviewed for tone and length
- [ ] Dashboard widgets mapped to the correct source
- [ ] Snapshot exported and named clearly

### Snapshot naming

`Academy Growth Blueprint`

## 10. Implementation Notes

- Do not redesign the blueprint
- Do not expand scope beyond the listed objects
- Keep the snapshot reusable across academies, schools, courses, trainers, and education centers
- Keep Opsly as the control / visibility layer
- Keep GHL as the operational layer
- Keep the brand aligned with the supplied ICSO visual identity

