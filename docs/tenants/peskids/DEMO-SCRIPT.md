---
status: draft
owner: operations
last_review: 2026-05-24
type: tenant
tags:
  - opsly/tenant
---

# Peskids MVP Demo Script

**Duration:** 10 minutes  
**Audience:** Peskids owner + admin staff  
**Language:** Spanish (primary), English (backup)  
**Format:** Read aloud while sharing screen  

---

## Local demo walkthrough (`localhost:3004`)

**Antes de la reunión:** desde la raíz del monorepo:

```bash
npm run dev --workspace=peskids
# Abre http://localhost:3004
```

| Paso | URL | Qué mostrar |
|------|-----|-------------|
| 1 | `http://localhost:3004/` | Landing con hero + **LeadCaptureForm** (modalidad, barrio, grado) |
| 2 | Enviar lead de prueba | Toast éxito; datos en Supabase `peskids.leads` |
| 3 | `http://localhost:3004/admin/login` | Login owner (`sierrasantiago90@gmail.com`) |
| 4 | `http://localhost:3004/admin` | Dashboard — 5 áreas: interesados, estudiantes, feedback, seguimientos, KPI operación |
| 5 | `http://localhost:3004/familias` | Portal familias + **FeedbackComposer** (rating 1–5; alerta si &lt; 3) |

**Wireframe estático (referencia visual Sprint 01):** abrir `docs/tenants/peskids/landing-wireframe.html` en el navegador si no hay dev server.

**Seed demo (opcional):** `./scripts/seed-peskids-demo-students.sh` — estudiantes, leads, follow-ups y feedback de ejemplo.

**[PENDIENTE-DECISIÓN]:** Copy final del hero y pricing en landing para producción.

---

## SPANISH VERSION (VERSIÓN EN ESPAÑOL)

### Introducción (30 segundos)

"Hola [Nombre]. Gracias por tu tiempo hoy. Quiero mostrarte cómo Peskids puede ayudarte a organizar mejor tu programa y crecer sin perder ni un solo lead.

¿Actualmente, cómo haces seguimiento a los leads nuevos? ¿Y a los padres que dan feedback?"

*[Pausa para respuesta]*

---

### Problema Actual (1 minuto)

"Perfecto. Entonces hoy recibiste una solicitud de inscripción pero está en tu email. Mañana recibes un feedback de una madre pero está en un chat de WhatsApp. Pasado mañana alguien llama pero no está documentado. Y de repente, se te olvidó hacer seguimiento con María porque nunca viste el mensaje.

¿Te suena familiar?"

*[Pausa]*

"El problema es que no hay un lugar donde ver TODO de un vistazo. Y sin visibilidad, pierdes oportunidades."

---

### Solución: Peskids MVP (2 minutos)

"Aquí es donde entra Peskids. Te voy a mostrar exactamente cómo funciona en 5 minutos.

La idea es simple:

1. **Los padres llenan un formulario** — solicitan información
2. **Tú ves TODO en un dashboard** — uno solo lugar, sin emails, sin chats
3. **Ves qué hacer** — quién necesita seguimiento, quién dejó feedback
4. **Tú controlas todo** — nada es automático sin tu aprobación
5. **Recibes un resumen semanal** — sin sorpresas

Let me show you visually..."

*[Share screen with wireframes]*

---

### Landing Page (1 minuto)

*[Show wireframe]*

"Esto es lo que ven los padres cuando buscan tu programa. Es simple:
- Tu foto/logo
- ¿Qué es Peskids?
- Botón 'Solicitar Información'
- Formulario de 5 preguntas

Los padres lo llenan. Tú recibes sus datos aquí. No se pierde nada."

---

### Dashboard (3 minutos)

*[Show dashboard wireframe with 5 cards]*

"Ahora, aquí es el corazón de Peskids. Tu dashboard personal. Mira:

**Card 1: Leads Nuevos Esta Semana**
— Cuántos padres new solicitaron información
— Nombres, emails, teléfonos
— Qué grado les interesa
— Un clic para hacer seguimiento

**Card 2: Alumnos Activos**
— Cuántos niños estáinscritos hoy
— Dividido por grado
— Tendencia semana a semana

**Card 3: Feedback de Padres**
— Qué dijeron los padres esta semana
— Puntuación (⭐⭐⭐⭐⭐)
— Si alguien está insatisfecho, lo ves inmediatamente (color rojo)

**Card 4: Seguimientos Pendientes**
— Cosas que aún no hiciste
— A quién le prometiste llamar, y cuándo
— Un clic para marcar como hecho

**Card 5: Tendencia Esta Semana**
— Gráfico simple mostrando si creciste
— 5 leads lunes, 3 martes, 7 miércoles, etc.

Todo esto se actualiza en tiempo real. Si entra un lead AHORA, lo ves aquí en segundos.

¿Ves cómo es diferente a revisa emails + WhatsApp + llamadas?

This is ONE screen. Everything you need to run your program."

---

### Formulario de Lead (1 minuto)

*[Show form wireframe]*

"Esto es lo que ven los padres. 5 preguntas:

1. ¿Tu nombre?
2. ¿Tu email?
3. ¿Tu teléfono? (opcional)
4. ¿Qué grado? (K–5, 6–8, o 9–12)
5. ¿Cómo nos encontraste? (Google, amigo, Instagram)

Responden en 2 minutos. Tú lo ves al instante en el dashboard.

Sin perderse. Sin olvidar. Listo."

---

### Feedback de Padres (1 minuto)

*[Show feedback form]*

"Una vez a la semana les haces una pequeña encuesta a los padres:

'¿Qué tal la semana de tu hijo?'

Ellos contestan (⭐⭐⭐⭐⭐) y dan una sugerencia si quieren.

Si dan baja puntuación, te alertamos. Así NO pierdes un cliente insatisfecho.

Todo registrado. Todo organizado."

---

### Seguimiento (1 minuto)

*[Show follow-up tracking]*

"Cuando ves un lead nuevo, haces clic 'Hacer seguimiento'. Peskids lo memoriza:

'Llamar a María — viernes 3pm'

Viernes llega, ves en el dashboard: 'Todavía debo hablar con María'. Haces la llamada. Regresas. Haces clic 'Completado'. Listo.

Y si necesitas otro seguimiento: 'Próximo: 2 semanas.' Peskids lo anota.

Nada se cae. Nada se olvida."

---

### Lo que NO incluye este MVP (1 minuto)

"Importante: esto es el MVP. No tiene algunas cosas... todavía.

❌ **NO** enviamos mensajes automáticos a padres (aún no)
❌ **NO** usamos WhatsApp automático
❌ **NO** hay inteligencia artificial generando mensajes por ti
❌ **NO** es multi-idioma todavía (solo español)

**Todo es aprobado por ti primero.** Si cambias de opinión, editamos. Si quieres añadir algo, lo anotamos.

Esto es una herramienta PARA ti, no una herramienta que te controla."

---

### Timeline (1 minuto)

"El plan es así:

**Sprint 1 (ahora):** Finalizamos el diseño. Los wireframes que ves hoy. Las formas exactas. El dashboard layout. (7 días)

**Sprint 2:** Construimos la página web. Conectamos la base de datos. Haces tu primer test. (7 días)

**Sprint 3:** Publicamos en vivo. Los padres pueden solicitar. Tú ves todo. Comenzamos a crecer. (7 días)

Tres semanas. MVP listo."

---

### Preguntas & Cierre (1 minuto)

"¿Dudas hasta ahora?

*[Pausa para respuesta]*

Si miramos el dashboard hoy, ¿cuál es la métrica más importante para ti? ¿Quieres ver nuevos leads? ¿Feedback de padres? ¿Tendencias?

*[Listen]*

Perfecto. Entonces comenzamos la próxima semana con esto.

¿Alguna otra pregunta antes de que empecemos?

*[Close if ready]*

Excelente. El primer paso es el Sprint 1. Perfeccionamos el diseño. Tú lo ves y me das feedback. Y dentro de una semana, comenzamos a construir.

¿Listo?"

---

---

## ENGLISH VERSION (BACKUP)

### Local demo (same as Spanish section)

Use `http://localhost:3004` — landing → admin dashboard → `/familias` feedback. See table in *Local demo walkthrough* above.

### Introduction (30 seconds)

"Hello [Name]. Thanks for making time today. I want to show you how Peskids can help you organize your program better and grow without losing a single lead.

Currently, how do you track new inquiries? And parent feedback?"

*[Pause for response]*

---

### The Problem (1 minute)

"I see. So today you got an enrollment request but it's in your email. Tomorrow a mother leaves feedback but it's in a WhatsApp chat. The day after someone calls but it's not documented. And suddenly, you forgot to follow up with Maria because you never saw the message.

Sound familiar?"

*[Pause]*

"The problem is there's no single place to see everything at a glance. Without visibility, you lose opportunities."

---

### The Solution: Peskids MVP (2 minutes)

"This is where Peskids comes in. Let me show you exactly how it works in 5 minutes.

The idea is simple:

1. **Parents fill out a form** — they request information
2. **You see EVERYTHING in one dashboard** — one place, no emails, no chats
3. **You know what to do** — who needs follow-up, who left feedback
4. **You control it all** — nothing is automatic without your approval
5. **You get a weekly summary** — no surprises

Let me show you visually..."

*[Share screen with wireframes]*

---

### Landing Page (1 minute)

*[Show wireframe]*

"This is what parents see when they search for your program. It's simple:
- Your photo/logo
- What is Peskids?
- 'Request Information' button
- 5-question form

Parents fill it out. You get their info right here. Nothing gets lost."

---

### Dashboard (3 minutes)

*[Show dashboard wireframe with 5 cards]*

"Now, here's the heart of Peskids. Your personal dashboard. Look:

**Card 1: New Leads This Week**
— How many parents requested information
— Names, emails, phone numbers
— What grade they're interested in
— One click to follow up

**Card 2: Active Students**
— How many kids are enrolled today
— Broken down by grade level
— Trend week-over-week

**Card 3: Parent Feedback**
— What parents said this week
— Rating (⭐⭐⭐⭐⭐)
— If someone is unhappy, you see it immediately (red flag)

**Card 4: Pending Follow-ups**
— Things you haven't done yet
— Who promised you'd call, and when
— One click to mark as done

**Card 5: This Week's Trend**
— Simple graph showing if you're growing
— 5 leads Monday, 3 Tuesday, 7 Wednesday, etc.

Everything updates in real-time. If a lead comes in RIGHT NOW, you see it here in seconds.

See how different this is from checking emails + WhatsApp + answering calls?

This is ONE screen. Everything you need to run your program."

---

### Lead Form (1 minute)

*[Show form wireframe]*

"This is what parents see. 5 questions:

1. What's your name?
2. What's your email?
3. What's your phone? (optional)
4. What grade? (K–5, 6–8, or 9–12)
5. How did you find us? (Google, friend, Instagram)

They answer in 2 minutes. You see it instantly in the dashboard.

Nothing gets lost. Nothing gets forgotten. Done."

---

### Parent Feedback (1 minute)

*[Show feedback form]*

"Once a week, you send a quick survey to parents:

'How was your child's week with us?'

They answer (⭐⭐⭐⭐⭐) and leave a suggestion if they want.

If they give low marks, we alert you. So you DON'T lose a unhappy customer.

Everything is recorded. Everything is organized."

---

### Follow-ups (1 minute)

*[Show follow-up tracking]*

"When you see a new lead, you click 'Schedule Follow-up'. Peskids remembers it:

'Call Maria — Friday 3pm'

Friday comes, you see in the dashboard: 'Still need to call Maria'. You make the call. You come back. You click 'Completed'. Done.

And if you need another follow-up: 'Next: 2 weeks.' Peskids notes it.

Nothing falls through the cracks. Nothing gets forgotten."

---

### What This MVP Does NOT Include (1 minute)

"Important: this is the MVP. It doesn't have some things... yet.

❌ We do **NOT** auto-send messages to parents (not yet)
❌ We do **NOT** use WhatsApp automation
❌ We do **NOT** have AI generating messages for you
❌ We do **NOT** support multiple languages (English + Spanish only, later)

**Everything is approved by you first.** If you change your mind, we edit it. If you want to add something, we note it.

This is a tool FOR you, not a tool that controls you."

---

### Timeline (1 minute)

"Here's the plan:

**Sprint 1 (now):** We finalize the design. The wireframes you see today. The exact forms. The dashboard layout. (7 days)

**Sprint 2:** We build the website. We connect the database. You do your first test. (7 days)

**Sprint 3:** We go live. Parents can request info. You see everything. We start growing. (7 days)

Three weeks. MVP ready."

---

### Questions & Close (1 minute)

"Any questions so far?

*[Pause for response]*

If we look at the dashboard today, what's the most important metric for you? Do you want to see new leads? Parent feedback? Trends?

*[Listen]*

Perfect. So we'll start next week with that.

Any other questions before we dive in?

*[Close if ready]*

Excellent. The first step is Sprint 1. We refine the design. You see it and give me feedback. And in one week, we start building.

Ready?"

---

---

## Demo Preparation Checklist

**30 minutes before:**
- [ ] Have all wireframes open in Figma or PowerPoint
- [ ] Have FORMS-SPEC.md visible (to show form examples)
- [ ] Have DASHBOARD-SPEC.md open (to show card details)
- [ ] Zoom/Teams/Meet running, test audio/video
- [ ] Have owner's phone number (in case connection fails)
- [ ] Have a backup email ready (to send wireframes post-demo)

**During demo:**
- [ ] Read from script slowly, natural pace
- [ ] Pause for questions ("does this make sense?")
- [ ] Show wireframes on screen while talking
- [ ] Let owner answer the "how do you do it now?" question (builds trust)
- [ ] Point at screen when showing cards/forms
- [ ] Note down owner's feedback in real-time

**After demo (within 1 hour):**
- [ ] Send wireframes via email (Figma link or PDF)
- [ ] Ask owner to mark up within 3 days
- [ ] Schedule follow-up call to discuss feedback
- [ ] Send MVP-BACKLOG.md and SPRINT-01.md for review

---

## Anticipated Questions & Responses

**Q: "Will the parents see that it's Peskids behind this?"**

A: "No. They just see a form that looks like it's from you. Professional, simple. When they enroll, they see Peskids mentioned as the tool, but the experience is 100% yours."

**Q: "Can you integrate with [their current system]?"**

A: "We can sync data with most systems. Let me note that down and we'll explore it in Sprint 2 once the MVP is live."

**Q: "What if I want to change something about the dashboard?"**

A: "Easy. You want to see different cards? Different layout? We adjust. This MVP is a starting point, not the final version. Your feedback shapes it."

**Q: "How much does this cost?"**

A: "We'll discuss pricing after you see the MVP working. First, let's make sure it solves your problem. Then we talk cost."

**Q: "When can we go live?"**

A: "If we start Monday, Sprint 3 (live launch) is around June 8. Three weeks total. But we need your feedback by end of Sprint 1 so we can build Sprint 2 without delays."

---

## Success Signals During Demo

✅ Owner asks questions (shows engagement)  
✅ Owner takes notes (shows seriousness)  
✅ Owner says "yes, I need this"  
✅ Owner suggests "can you add X?" (validation, not rejection)  
✅ Owner asks "when can we start?"  

---

## Red Flags During Demo

❌ Owner says "this is too complicated" (simplify for next call)  
❌ Owner says "I don't have time for this" (offer async approach)  
❌ Owner asks "who will use this?" (they might not be the end user)  
❌ Owner goes silent (stop, ask "what are you thinking?")  

---

## After Demo: Next Steps

**If owner says YES:**
- Schedule Sprint 1 kickoff (next day)
- Send all documentation (backlog, sprint, specs)
- Ask for 3-day feedback window
- Start wireframe refinement

**If owner says "let me think":**
- Send all docs via email
- Schedule follow-up in 3 days
- Offer async feedback (email, Figma comments)
- Send sample wireframes/designs for them to edit

**If owner says NO or seems hesitant:**
- Ask: "What's the biggest concern?"
- Take notes
- Offer to simplify/remove features
- Never push; respect their timeline


---

## Enlaces relacionados

- [[tenants/peskids/README|peskids]]
- [[brain/README|Brain Central]]
