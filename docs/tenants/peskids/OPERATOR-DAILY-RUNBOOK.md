# PESKIDS — DAILY OPERATOR RUNBOOK

**Última actualización:** 2026-06-15  
**Para:** Operadores de Peskids  
**Tiempo dedicación:** 30-60 min/día

---

## INICIO DEL DÍA (9:00am)

### 1. Dashboard Check (2 min)
```
URL: https://peskids.op-sly.com/admin/login
```

**Qué verificar:**
- [ ] Sistema responde (200 OK)
- [ ] Número de leads nuevos vs. ayer
- [ ] Leads sin contactar (pendientes)
- [ ] Clases de prueba programadas hoy
- [ ] Notificaciones/alertas sin resolver

**Si hay alerta roja:**
→ Ir a TROUBLESHOOTING (al final)

---

## MAÑANA: CONTACTAR LEADS (9:30am-12:00pm)

### 2. Nuevo leads: Contactar
```
Dashboard → Leads → "New Lead"
```

**Para cada lead:**
1. Haz clic en contacto
2. Lee: nombre, teléfono, edad del niño, horario preferido
3. Acciones:
   - [ ] **WhatsApp/SMS:** "Hola [nombre], recibimos tu solicitud. ¿Mañana a las 10am te va bien para la clase de prueba?"
   - [ ] **Agendar cita:** Selecciona hora + instructor
   - [ ] **Cambiar estado:** New Lead → Trial Booked

**Sistema automático:**
- GHL envía confirmación automática (no hagas nada)
- SMS recordatorio 24h antes (automático)

---

## MEDIODÍA: CONFIRMACIONES (12:00pm-1:00pm)

### 3. Confirmar asistencia de padres

**Para cada cita agendada hoy:**
1. Revisa respuestas en WhatsApp/SMS
2. Si confirmó: ✅ Marcar en dashboard
3. Si no respondió: Envía otro SMS "¿Confirmas tu clase?"

---

## TARDE: CLASES DE PRUEBA (1:00pm-6:00pm)

### 4. Durante clase de prueba

**Antes de clase:**
- [ ] Instructor tiene estudiante en sistema
- [ ] Horario confirmado

**Durante clase:**
- Instructor es responsable (no es tarea tuya)

**Después de clase (30 min después):**
1. Marca en dashboard: "Trial Completed" ✅
2. GHL automáticamente enviará propuesta de inscripción
3. Si padre pregunta por precio → lee la propuesta que GHL envió

---

## FIN DEL DÍA (4:00pm-5:00pm)

### 5. Cierre diario

**Revisa:**
- [ ] Número total de leads hoy: ___
- [ ] Clases de prueba completadas: ___
- [ ] Nuevas inscripciones: ___
- [ ] Problemas sin resolver: ___

**Envía reporte Slack:**
```
Peskids Daily — 2026-06-15
Leads: 3 nuevos
Trials: 2 completadas  
Enrolled: 1 nuevo
Issues: ninguno
```

---

## SEMANALMENTE (VIERNES)

### 6. Limpieza y follow-up

**Leads que no respondieron hace 3+ días:**
1. Dashboard → Leads → "Contacted (no response)"
2. Envía SMS: "¿Sigue interesado en la clase de prueba?"

**Estudiantes sin clase en 2 semanas:**
1. Dashboard → Active Students
2. Envía SMS: "¡Te extrañamos! ¿Cuándo volvemos?"

---

## MÉTRICAS CLAVE (Track diariamente)

| Métrica | Target | Status |
|---------|--------|--------|
| Leads/semana | 5+ | __ |
| Conversion (lead→trial) | 60%+ | __ |
| Trial attendance | 80%+ | __ |
| Trial→enrollment | 50%+ | __ |
| Renewal rate | 90%+ | __ |

**Dashboard:** https://peskids.op-sly.com/admin/metrics (cuando esté listo)

---

## PREGUNTAS FRECUENTES

### "¿Cómo cambio la hora de una clase?"
1. Dashboard → Calendar
2. Haz clic en clase
3. Edit → Selecciona nueva hora
4. Save
5. GHL automáticamente enviará SMS nuevo al padre

### "¿Cómo añado un instructor nuevo?"
1. Dashboard → Settings → Instructors
2. Add → Nombre + disponibilidad
3. Save
4. Aparecerá en selector de clases

### "¿Qué hago si un padre se queja?"
1. Anota el problema en dashboard (Notas campo)
2. Envía a Slack: `@peskids-support`
3. Equipo Opsly responde en <2h

### "¿Cómo veo las ganancias?"
Aún no implementado. Track manual en hoja de cálculo o pide a Opsly.

---

## TROUBLESHOOTING

### "El sistema no responde"
```bash
# Check status
curl https://peskids.op-sly.com/api/health

# If 200 OK → refresh page
# If error → escalate a Opsly
```

### "Un lead no recibe confirmación por SMS"
1. Verifica número de teléfono (¿es válido?)
2. Mira historial en dashboard (¿qué se envió?)
3. Si nada → escalate a Opsly
   - Slack: `@support-peskids`
   - Email: `support@intcloudsysops.com`

### "Una clase no aparece en el calendario"
1. Dashboard → Calendar
2. Filter by instructor
3. Si sigue no viéndose → refresh o escalate

### "No puedo loguearme"
1. Verifica contraseña (¿caps lock?)
2. Reset password → email
3. Si no llega email → escalate

---

## CONTACTOS DE EMERGENCIA

| Equipo | Contacto | Disponible |
|--------|----------|-----------|
| Opsly Support | `support@intcloudsysops.com` | 24/7 (Slack) |
| Technical Support | `tech@opsly.io` | 9am-6pm COL |
| Billing | `billing@opsly.io` | 9am-5pm COL |

**Slack:** #peskids-support

---

## ACCESO RÁPIDO

- **Admin Login:** https://peskids.op-sly.com/admin/login
- **GHL Dashboard:** https://app.gohighlevel.com/v2/location/KJ5LawrOOe3hIerqtMRu/dashboard
- **n8n Workflows:** https://n8n-peskids.op-sly.com
- **Uptime Monitor:** https://uptime-peskids.op-sly.com
- **Status Page:** https://peskids.op-sly.com/api/health

---

**¿Preguntas?** → Slack `#peskids-support`
