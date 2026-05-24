---
status: active
created: 2026-05-23
target_demo_date: 2026-05-24
duration_minutes: 5
language: es
---

# Peskids Demo Walkthrough (5 minutes)

**Objetivo:** Demostrar a Sierra Santiago (owner) la plataforma Peskids lista para producción.

**Audiencia:** Owner + Operations  
**Formato:** Screen share + live interaction  
**Ambiente:** Vercel production URL (post-deployment)

---

## Pre-Demo Setup (Owner's Perspective)

**Debe tener:**
- URL de Vercel: `https://peskids-[hash].vercel.app`
- Admin secret token (guardado en lugar seguro)
- Acceso a Slack #peskids-alerts
- Navegador moderno (Chrome, Safari, Firefox)

**Check antes de demo:**
- [ ] Landing page carga sin errores (F12 → Console vacía)
- [ ] Formulario es visible y tiene todos los campos
- [ ] Dashboard accesible en `/admin`
- [ ] Slack webhook conectado

---

## Demo Script (Estimated 5 min)

### Segmento 1: Landing Page (1 min)

**Narración:**

> *"Hola Sierra, esto es Peskids en producción. Mira la landing page aquí. Tenemos nuestro logo personalizado, los beneficios destacados, y un formulario de contacto directo."*

**Acciones:**
1. Visita: `https://peskids-[hash].vercel.app`
2. Scroll down lentamente:
   - **Hero section:** "Aprenden. Se divierten. Son Peskids."
   - **Copy:** Academia de natación 3 meses-15 años, clases en Llanogrande o domicilio
   - **Stats:** 14 años, 2800+ niños, 6 niveles
   - **CTA buttons:** "Chat" y "WhatsApp"
3. Point out: "Todo diseñado para convertir visitantes en leads."

**Expected:**
- Owner sees branded, professional landing page
- Confidence: "This looks ready to show to clients"

---

### Segmento 2: Lead Form Submission (1.5 min)

**Narración:**

> *"Ahora vamos a llenar el formulario como si fueras un padre interesado. Mira cómo funciona."*

**Acciones:**
1. Scroll to form section (or click "Escribir por WhatsApp" / "Chat" to trigger form)
2. Fill form with test data:
   - **Nombre:** "María García"
   - **Email:** "maria@example.com"
   - **Teléfono:** "300 5555555"
   - **Grado interesado:** "3º (8-9 años)"
   - **Modalidad de clase:** "Llanogrande"
3. Click **"Enviar"**
4. **Expected:** Redirect to thank-you page with message: "¡Gracias por tu interés!"

**Key point:** "El formulario validó todos los campos, mandó los datos a la base de datos, y confirmó al usuario instantáneamente."

---

### Segmento 3: Admin Dashboard (1.5 min)

**Narración:**

> *"Ahora vamos al panel de administrador. Aquí puedes ver todos los leads, feedback, y métricas en tiempo real."*

**Acciones:**
1. Navigate to: `https://peskids-[hash].vercel.app/admin`
2. **Login prompt:** Paste admin secret token
   - Click "Entrar"
3. **Expected:** Dashboard loads with 5 cards:
   - **📊 New Leads This Week**
     - Count: 1 (the test lead we just submitted)
     - List shows: "María García | maria@example.com | 3º (8-9 años) | Llanogrande"
   - **👥 Active Students**
     - Count: 0 (MVP, seeded later)
   - **⭐ Parent Feedback**
     - Avg rating: -- (no feedback yet)
     - Recent: (empty)
   - **✅ Pending Follow-ups**
     - Count: 0 (placeholder for Phase 2)
   - **📈 Weekly Trend**
     - Placeholder: "Coming Soon"

4. Point out:
   - "El lead que acabo de capturar aparece aquí automáticamente"
   - "Los datos se actualizan cada 5 segundos"
   - "Todo es seguro — solo TÚ puedes acceder con tu contraseña"

**Key point:** "Real-time visibility into your business — no more spreadsheets."

---

### Segmento 4: Alerts & Automation (Slack) (0.5 min)

**Narración:**

> *"Uno de los superpoderes de Peskids es la automatización. Cuando un padre deja una reseña negativa, te alertamos al instante."*

**Acciones:**
1. **Option A (if time permitting):** 
   - Go to `/feedback` form (from footer or menu)
   - Submit dummy feedback with rating 1 ⭐
   - Check #peskids-alerts Slack channel
   - Show alert message:
     ```
     🚨 Low Satisfaction Alert
     Rating: 1 ⭐
     Child: [name]
     Message: "No nos gustó"
     Action: Reply vía WhatsApp o email
     ```

2. **Option B (demo pre-recorded):**
   - Show screenshot of previous alert in Slack
   - "Este es un ejemplo de alerta automática"

**Key point:** "Nunca pierdes una oportunidad — sabemos de insatisfacción dentro de segundos."

---

### Segmento 5: Q&A & Next Steps (1 min)

**Narración:**

> *"Eso es la MVP de Peskids. Está lista para que empieces a capturar leads reales. ¿Preguntas?"*

**Expected owner questions & responses:**

| Pregunta | Respuesta |
|----------|-----------|
| "¿Puedo cambiar el logo/colores?" | Sí, fácil. Tenemos design tokens en la codebase. |
| "¿Qué pasa con los leads?" | Se guardan en Supabase (privado, seguro). En Phase 2 los mandamos a WhatsApp automático. |
| "¿Cuándo puedo empezar a recibir leads reales?" | Hoy mismo. Cuando tengas el dominio, mandamos el link a tus clientes. |
| "¿Qué pasa si se cae?" | Vercel cuida la disponibilidad. Si hay problema, te alertamos en Slack. |
| "¿Cuánto cuesta?" | Hosting en Vercel: ~$10-20/mes. Supabase: ~$15-30/mes (escala con datos). |

**Close:**

> *"Esto es Phase 1 — lo básico funcionando. En Phase 2 (próxima semana) activamos:*
> - *WhatsApp automático para nuevo leads*
> - *Follow-up reminders*
> - *Reportes semanales*
> - *Analytics avanzado*
> 
> *¿Quieres que hagamos go-live?"*

---

## Success Metrics

✅ **Demo es exitoso si:**

1. Owner entiende funcionalidad core (form → lead → dashboard)
2. Owner ve su lead en tiempo real en el dashboard
3. Owner recibe Slack alert (o ve screenshot)
4. Owner says "This is what I need" or "When can we go live?"
5. Owner approves Phase 2 timeline (WhatsApp, follow-ups, reporting)

❌ **Demo falló si:**

- Formulario no envía (DB error)
- Dashboard vacío (RLS issue o wrong tenant_id)
- Slack alert no llega (webhook not configured)
- Owner confused about data/privacy (explain security)

---

## Contingency Plans

### Si cae Vercel durante demo:

1. **Pre-recorded demo** (MP4 video de run-through anterior)
2. Enseña código en GitHub
3. Schedule follow-up demo cuando se recupere

### Si Slack webhook no funciona:

1. Muestra screenshot de alerta previa
2. Explica: "La integración está lista — se activa en Phase 2 cuando Jelou esté configurado"

### Si owner preocupado por seguridad/privacidad:

1. Explica: "Todo en Supabase (auditable). Archivos encriptados en tránsito (HTTPS). Solo tú + Peskids staff con acceso."
2. "En Phase 3 añadimos audit logs para compliance completo."

---

## Follow-Up (After Demo)

**Mismo día:**

- [ ] Owner confirms "go live" or lists blockers
- [ ] Schedule Phase 2 kickoff (May 27)
- [ ] Document decision in `docs/tenants/peskids/DECISION-LOG.md`

**Next 24h:**

- [ ] Share demo recording (if recorded)
- [ ] Send owner runbook + FAQ
- [ ] Activate owner's Slack channel access

---

## Demo Checklist (Run 30 min before)

- [ ] Vercel production URL loads without errors
- [ ] All env vars in place (no "Database not configured")
- [ ] Test lead form submission (clear browser cache: Ctrl+Shift+Del)
- [ ] Check Supabase: new lead appears in `leads` table
- [ ] Test admin login (try 2–3 times if cookie issues)
- [ ] Slack webhook responds (test with dummy alert)
- [ ] Timing: Dry-run full script once (5 min ceiling)
- [ ] Internet connectivity solid (no Tailscale/VPN issues)
- [ ] Phone nearby for backup/emergency contact

---

## Notes for Operations

**Owner:** sierrasantiago90@gmail.com  
**Timezone:** Colombia (UTC-5)  
**Demo date:** 2026-05-24 (Friday)  
**Time:** TBD (coordinate with owner)  
**Format:** Zoom / in-person (owner preference)  
**Backup URL:** Staging on opsly-admin Mac if Vercel down

---

**Version:** 1.0  
**Last updated:** 2026-05-23  
**Next review:** After Phase 1 sign-off (2026-05-26)

---

## Enlaces relacionados

- [[tenants/peskids/README|peskids]]
- [[brain/README|Brain Central]]
