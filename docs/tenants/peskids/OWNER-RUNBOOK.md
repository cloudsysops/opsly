---
status: active
owner: sierrasantiago90@gmail.com
created: 2026-05-23
target_audience: "Peskids owner, staff"
---

# Peskids — Owner Runbook

**Quick-start guide for Sierra Santiago and team.**

Versión: Spanish (Español) — [English version](#english-version)

---

## Contenido

1. [Acceso rápido](#acceso-rápido)
2. [Panel de administrador](#panel-de-administrador)
3. [Gestión de leads](#gestión-de-leads)
4. [Feedback y alertas](#feedback-y-alertas)
5. [WhatsApp (Phase 2)](#whatsapp-phase-2)
6. [Troubleshooting](#troubleshooting)
7. [Contacto y soporte](#contacto-y-soporte)

---

## Acceso rápido

| Recurso | URL | Usuario |
|---------|-----|---------|
| Landing page | `https://peskids.op-sly.com` | Público |
| Admin panel | `https://peskids.op-sly.com/admin` | Solo con contraseña |
| Formulario de lead | Embedded en landing | Público |
| Feedback (padres) | Link en footer | Público |
| Slack alerts | #peskids-alerts | Auto (si config) |

**Tu contraseña de admin:** Guárdala en lugar seguro. No la compartas.

---

## Panel de Administrador

### Acceso

1. Ve a: `https://peskids.op-sly.com/admin`
2. Se abrirá un diálogo pidiendo contraseña
3. Pega tu **contraseña de admin**
4. Click "Entrar"

**¿Olvidaste la contraseña?** 
Contacta a ops@intcloudsysops.com (rotaremos tu token en <1h).

### Dashboard — 5 tarjetas principales

#### 1️⃣ New Leads This Week

**Qué ves:**
- Número total de leads nuevos esta semana
- Lista con nombres, email, grado interesado, modalidad de clase

**Qué hacer:**
- Haz click en un lead → ve detalles completos
- **Next phase:** Botón para enviar WhatsApp automático
- **Next phase:** Marcar como "contacted" / "qualified" / "lost"

**Tip:** Ordena por fecha más reciente → contacta los leads más frescos primero.

---

#### 2️⃣ Active Students

**Qué ves:**
- Número de estudiantes activos en este momento
- Detalles: nombre, grado, nivel de natación

**Qué hacer:**
- Vista solo lectura en MVP (Phase 1)
- En Phase 2: edita estado, asigna profesor, ve agenda

**Por qué importa:** Te da visión de capacidad y ocupación.

---

#### 3️⃣ Parent Feedback

**Qué ves:**
- Rating promedio (estrellas) de feedback de padres
- Últimos 5 comentarios
- Lista de preocupaciones o sugerencias

**Qué hacer:**
- Lee feedback para mejorar clases
- **Si rating <3 ⭐:** Recibirás alerta en Slack (Phase 2) → responde vía WhatsApp
- Exporta feedback mensual para análisis

**Importante:** El feedback es anónimo si el padre eligió. Si incluye nombre → responde personalmente.

---

#### 4️⃣ Pending Follow-ups

**Qué ves:**
- Lista de acciones pendientes (leads sin contactar, padres sin pagar, etc.)
- Fecha vencimiento
- Asignado a quién

**Qué hacer:**
- Click en follow-up → ver contexto (ej: "Enviar catálogo")
- Mark "done" cuando completado
- En Phase 2: recordatorios automáticos vía WhatsApp/email

---

#### 5️⃣ Weekly Trend

**Qué ves:**
- MVP: "Coming Soon" (placeholder)
- Phase 2: Gráfico de leads por día, feedback trend, conversión

**Próximamente:** Verás línea de tendencia, picos de actividad, y predicciones.

---

### Acciones del Dashboard

**Auto-refresh:** Cada 5 segundos (sin tocar refresh)

**Export:** (Phase 2 feature)
- Click botón "Exportar" → descarga CSV con:
  - Todos los leads
  - Feedback completo
  - Follow-ups abiertos
  - Datos para análisis externo

---

## Gestión de Leads

### Ciclo de vida típico de un lead

```
[New] → [Contacted] → [Qualified] → [Won] o [Lost]
```

### Estados

| Estado | Significado | Próxima acción |
|--------|-----------|---------|
| **new** | Recién llegó via formulario | Contactar ASAP (ideal <2h) |
| **contacted** | Enviaste mensaje / llamaste | Esperar respuesta o follow-up |
| **qualified** | Interesado, evaluó opciones | Enviar contrato / agendar clase demo |
| **converted** | Pagó y empezó clases | Enviar bienvenida + onboarding |
| **lost** | Decidió no continuar | Archivar, opcional: pedir feedback |

### Flujo recomendado

1. **Lead llega:** Dashboard muestra al instante
2. **Tú haces:** Click en lead → Lee email/teléfono
3. **Envía mensaje:** Vía WhatsApp (Phase 2) o manualmente
4. **Follow-up:** Si no responde en 3 días, recordatorio automático
5. **Conversión:** Cuando se inscriba, marca como "converted"

---

## Feedback y Alertas

### Cómo reciben feedback los padres

1. Pueden dejar reseña vía:
   - Link en footer del sitio (`/feedback`)
   - WhatsApp (Phase 2): responden a mensaje directo
   - Email (Phase 2): form en newsletter

2. Dejan: **Rating (1-5 ⭐)** + **Comentario opcional**

### Alertas automáticas (Slack)

**Phase 1 (Current):**
- Rating <3 → Slack message en #peskids-alerts

**Phase 2:**
- Rating <3 → WhatsApp + Slack
- Trend alert: Si feedback baja <4 esta semana
- High engagement: Si >10 leads nuevos/semana

### Cómo responder

1. **Lee la alerta** en Slack
2. **Identifica el padre** (si tiene nombre)
3. **Envía WhatsApp personal:** "Hola [name], sentimos que el servicio no fue lo esperado. ¿Podemos mejorar?"
4. **Resuelve problema** (cambiar horario, profesor, modalidad)
5. **Sigue: **Envía feedback resolution en dashboard (next phase)

---

## WhatsApp (Phase 2)

**Coming May 27–30. Preview:**

### Lead notifications (auto)

Cuando lead nuevo llega:
```
🔔 Nuevo lead: María García
📍 Interesada en: 3º (8-9 años)
📱 Modalidad: Llanogrande
⏰ Recibido hace 2 min
👉 Responde rápido: https://peskids.app/leads/12345
```

### Reply with approval gate

Tú escribes respuesta:
```
Dashboard → Leads → María García → [Escribir respuesta]
```

Puedes:
- Borrador (draft) → revisar antes de enviar
- Enviar directo (si modo "auto")
- Plantillas prediseñadas: "Bienvenida", "Clase demo", "Horarios"

---

## Troubleshooting

### "No veo ningún lead en el dashboard"

**Posibles causas:**

1. **No hay leads reales aún**
   - Solución: Entra a formulario, prueba submitiendo
   - Si no aparece: Ver #2 abajo

2. **Conexión a Supabase caída**
   - Síntomas: Dashboard carga pero tarjetas vacías o "Error"
   - Solución: Reload página (Ctrl+R)
   - Si persiste: Contacta ops@intcloudsysops.com

3. **Admin no tiene permisos**
   - Síntomas: Dashboard carga pero dice "No data"
   - Solución: Cierra sesión (cookie → Settings → Clear) y vuelve a entrar

### "Formulario no envía — dice 'error'"

**Soluciones:**

1. Abre browser F12 (Developer Tools) → Console tab
2. Intenta llenar formulario otra vez
3. Lee error exacto en consola
4. Si error tiene "Database" → base de datos caída (raro)
5. Screenshot del error + envía a ops@intcloudsysops.com

### "¿Dónde veo mi dominio personalizado?"

**Phase 2 feature.** Por ahora:
- URL compartida: `https://peskids.op-sly.com`
- En Phase 2: Podemos conectar `peskids.co` (si tienes dominio)

### "¿Puedo cambiar colores/logo?"

**Sí, fácil:**
1. Envia nuevos assets (logo PNG, colores hex) a ops@
2. Hacemos cambios en <1 hora
3. Auto-deployment a production
4. Zero downtime

### "¿Cómo reseteo mi contraseña de admin?"

**Opción A (rápido):** Contacta ops@intcloudsysops.com → rotamos en <1h

**Opción B (si necesitas acceso AHORA):**
1. Borra cookies del sitio (Ctrl+Shift+Del → peskids.op-sly.com)
2. Intenta login de nuevo (nueva sesión)
3. Hay token en browser localStorage — no lo compartas

---

## Contacto y Soporte

### Equipo Opsly

| Rol | Email | Teléfono |
|-----|-------|----------|
| **Ops lead** | ops@intcloudsysops.com | — |
| **Emergency** | #peskids-alerts Slack | — |
| **Billing** | billing@op-sly.com | — |

### Horario soporte

- **Monday–Friday:** 9:00 AM – 6:00 PM (Colombia time)
- **Weekends:** Emergency only (Slack)

### Reporte un problema

1. Ve a `https://peskids.op-sly.com/support` (coming soon)
2. O escribe en Slack #peskids-incidents
3. O email: ops@intcloudsysops.com

**Incluye:**
- Qué intentaste hacer
- Error exacto (screenshot)
- Hora del problema
- Navegador + OS

---

## FAQ

### P: ¿Cuánto cuesta Peskids?

**R:** MVP (Phase 1) está incluido en tu suscripción de Opsly. 
- Hosting: VPS + Docker (incluido en Opsly infra)
- Base de datos: Supabase ~$15–30/mes (escala con datos)
- Total: ~$25–50/mes (muy competitivo)

### P: ¿Dónde está mi data?

**R:** Supabase (servidor en AWS us-east-1). Encriptado en tránsito y en reposo. Tienes backups automáticos. Puedes exportar en cualquier momento.

### P: ¿Puedo tener más usuarios admin?

**R:** Sí. Phase 2 feature. Contacta ops para añadir staff.

### P: ¿Qué pasa si el hosting se cae?

**R:** Recibirás alerta en Slack + status page. El servicio está monitorizado por Uptime Kuma y los checks de GitHub Actions.

### P: ¿Puedo integrar Peskids con mi CRM/ERP?

**R:** Sí. Tenemos API (documentada). Phase 3 feature: integraciones pre-built (HubSpot, Pipedrive, etc).

### P: ¿Cuándo sale Phase 2?

**R:** May 27–30, 2026. (WhatsApp automático, follow-ups, reportes).

---

## Checklists rápidas

### Diariamente (5 min)

- [ ] Abre dashboard
- [ ] Lee nuevos leads (si hay)
- [ ] Lee alertas de Slack
- [ ] Responde leads prioritarios (mismo día)

### Semanalmente (15 min)

- [ ] Exporta leads de la semana
- [ ] Analiza feedback promedio
- [ ] Revisa follow-ups vencidos
- [ ] Planifica acciones de mejora

### Mensualmente (30 min)

- [ ] Exporta dashboard completo
- [ ] Analiza tendencias (leads/mes, conversión rate)
- [ ] Planifica marketing (si leads bajos)
- [ ] Reúnete con equipo (resultados)

---

## Próximos pasos

**This week:**
- ✅ Demo & go-live decision (May 24–26)
- ✅ Share dashboard con staff (tell them how to use)

**Next week:**
- 🔄 Phase 2 kickoff (WhatsApp, follow-ups, reports)
- 🔄 Activate Jelou form integration

**Future:**
- 📌 Phase 3: CRM export, advanced analytics, integrations

---

## Version Info

**Runbook version:** 1.0  
**Created:** 2026-05-23  
**For:** Peskids owner + staff  
**Language:** Spanish (Español)  
**Last updated:** 2026-05-23  

---

## English Version

[Link to: OWNER-RUNBOOK-EN.md] ← coming soon


---

## Enlaces relacionados

- [[tenants/peskids/README|peskids]]
- [[brain/README|Brain Central]]
