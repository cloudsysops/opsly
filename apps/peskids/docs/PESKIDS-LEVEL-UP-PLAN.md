# Peskids Level-Up Plan — De MVP a Mission Control

**Objetivo:** Llevar Peskids al nivel de los mockups visuales (Mission Control dashboard con KPIs, pipeline kanban, agentes, automatizaciones)

**Status:** En progreso  
**Rama:** `claude/peskids-cursor-avance-1ortri`  
**Target:** Semana de Aug 7–14, 2026

---

## 🎯 Mockups de referencia

### Image 1: Mission Control completo (Kanban + KPIs)
- **Header:** "Peskids Mission Control" + Search + Admin toggle + Notificaciones
- **KPI Strip:** 4 tarjetas grandes con tendencias (↑ ↓)
  - 18 "Interesados sin contactar" (+12% vs ayer)
  - 9 "Clases de prueba por confirmar" (+1.8% vs ayer)
  - 7 "Seguimientos vencidos" (+16% vs ayer)
  - 2 "Alertas de sincronización" (+50% vs ayer)
- **Pipeline Kanban:** 5 columnas (Nuevo → Contactado → Clase prueba → Seguimiento → Matriculado)
  - Cada lead es una tarjeta con: avatar, nombre, edad, próxima acción, canales (WhatsApp/Instagram/Email)
- **Gráfico:** "Rendimiento del pipeline" (bar chart: Nuevos, Conversión, Matriculación, Tiempo prom, Leads últimos 30 días)
- **Operaciones:** Tabla de operación del día con horarios y participantes
- **Agentes Opsly:** Operations Agent (Disponible) + Support Agent (Disponible)

### Image 2: Dashboard simplificado (Atención Inmediata)
- **Header:** Similar al anterior
- **ATENCIÓN INMEDIATA:** 4 tarjetas urgentes con botones de acción
  - 4 "Interesados sin contactar" → "Atender ahora"
  - 2 "Clases de prueba por confirmar" → "Revisar clases"
  - 3 "Seguimientos vencidos" → "Ver seguimientos"
  - 1 "Error de sincronización" → "Ver detalle"
- **OPERACIÓN DE HOY:** Timeline de eventos (09:00 Contactar Laura, 11:00 Clase Mateo, etc.)
- **EMBUDO COMERCIAL:** Tabla de conversiones por etapa (Nuevo→Contactado→Clase agendada→Clase realizada→Matriculado→Perdido)
- **AUTOMATIZACIONES:** Switches de 4 automatizaciones activas
- **AGENTES OPSLY:** 6 agentes (Operations, Sales, QA, Research, Planner, Support)
- **SYSTEM HEALTH:** Status de servicios (Orchestrator, LLM Gateway, Event Bus, Workers, DB, n8n, Twenty CRM)
- **RESOURCE USAGE:** Tokens (1.2M/2M), Costs ($3.45)

---

## 📋 Tareas por completar

### Fase 1: Dashboard KPIs y Header (HIGH PRIORITY)

**Tarea 1.1: Renovar Header del Admin**
- **Archivo:** `components/admin/admin-shell.tsx` (ya existe, mejorar)
- **Cambios:**
  - [ ] Agregar input de búsqueda global ("Buscar interesados, familias, clases...")
  - [ ] Agregar bell icon con contador de notificaciones (temporal: hardcoded)
  - [ ] Agregar botón "Admin" dropdown con opciones (Settings, Logout)
  - [ ] Agregar avatar del usuario (Santiago Admin)
  - [ ] Tema dark/light toggle (ya puede estar en Tailwind)
- **Dependencias:** Ninguna
- **Tiempo est:** 2–3 horas

**Tarea 1.2: Crear KPI Strip con tendencias**
- **Archivos a crear/mejorar:**
  - `components/admin/kpi-card.tsx` (nueva componente)
  - `components/admin/kpi-strip.tsx` (nueva componente)
- **Cambios:**
  - [ ] Componente `KpiCard` que muestre:
    - Número grande (18, 9, 7, 2)
    - Etiqueta descriptiva
    - % cambio vs ayer (↑ color verde, ↓ color rojo)
    - Icono representativo
  - [ ] Componente `KpiStrip` que agrupe 4 KpiCards
  - [ ] Fetch datos reales de API (`/api/admin/kpis` - crear endpoint)
- **Dependencias:** Tarea 1.1 (estilos)
- **Tiempo est:** 3–4 horas

**Tarea 1.3: Crear endpoint `/api/admin/kpis`**
- **Archivo:** `app/api/admin/kpis/route.ts` (nuevo)
- **Cambios:**
  - [ ] Query: contar `leads` con `status = 'new'`
  - [ ] Query: contar `leads` con `status = 'trial_pending'`
  - [ ] Query: contar `followups` con `due_at < now()`
  - [ ] Query: contar `sync_alerts` (tabla nueva o simulada)
  - [ ] Calcular % cambio vs ayer (comparar con fecha de 24h atrás)
  - [ ] Retornar JSON con datos + tendencias
- **Dependencias:** DB schema estable
- **Tiempo est:** 1–2 horas

**Tarea 1.4: Integrar KPI Strip en admin dashboard**
- **Archivo:** `app/admin/page.tsx` (mejorar)
- **Cambios:**
  - [ ] Importar `<KpiStrip />`
  - [ ] Renderizar debajo del header
  - [ ] Pasar datos de endpoint de Tarea 1.3
- **Dependencias:** Tareas 1.1, 1.2, 1.3
- **Tiempo est:** 1 hora

---

### Fase 2: Pipeline Kanban mejorado (HIGH PRIORITY)

**Tarea 2.1: Mejorar componente LeadPipelineKanban**
- **Archivo:** `components/admin/lead-pipeline-kanban.tsx` (ya existe, refactorizar)
- **Cambios actuales vs mockup:**
  - [ ] Verificar que tiene 5 columnas correctas: Nuevo → Contactado → Clase prueba → Seguimiento → Matriculado
  - [ ] Mejorar visualización de tarjetas de leads:
    - Avatar + nombre + edad
    - Etiquetas de canales (WhatsApp, Instagram, Email)
    - Botones de acción rápida (Próxima acción, Confirmar, etc.)
  - [ ] Agregar contador de leads por columna
  - [ ] Drag-and-drop mejorado (si no existe)
- **Dependencias:** Ninguna (refactor interno)
- **Tiempo est:** 2–3 horas

**Tarea 2.2: Agregar gráfico "Rendimiento del Pipeline"**
- **Archivo:** `components/admin/pipeline-performance-chart.tsx` (nueva)
- **Cambios:**
  - [ ] Bar chart mostrando 5 métricas:
    - Interesados nuevos (últimos 30 días)
    - Conversión a prueba
    - Conversión a matriculación
    - Tiempo promedio a matriculación (días)
    - Leads nuevos (últimos 30 días)
  - [ ] Usar Recharts o Chart.js
  - [ ] Colores consistentes con tema Peskids
- **Dependencias:** Endpoint `/api/admin/pipeline-stats`
- **Tiempo est:** 2–3 horas

**Tarea 2.3: Crear endpoint `/api/admin/pipeline-stats`**
- **Archivo:** `app/api/admin/pipeline-stats/route.ts` (nuevo)
- **Cambios:**
  - [ ] Agregar cálculos de conversión
  - [ ] Calcular tiempo promedio por etapa
  - [ ] Retornar datos últimos 30 días
- **Dependencias:** DB schema con `created_at`, `updated_at`
- **Tiempo est:** 1–2 horas

---

### Fase 3: Atención Inmediata + Operación del día (MEDIUM PRIORITY)

**Tarea 3.1: Crear panel "Atención Inmediata"**
- **Archivo:** `components/admin/immediate-attention-panel.tsx` (nueva)
- **Cambios:**
  - [ ] 4 tarjetas grandes con números + etiqueta + botón de acción
  - [ ] Colores diferenciados (rojo para crítico, naranja para moderado, amarillo para aviso)
  - [ ] Botones de acción ("Atender ahora", "Revisar clases", "Ver seguimientos", "Ver detalle")
- **Dependencias:** Tarea 1.3 (KPIs)
- **Tiempo est:** 2 horas

**Tarea 3.2: Crear panel "Operación de hoy"**
- **Archivo:** `components/admin/today-operations-panel.tsx` (nueva)
- **Cambios:**
  - [ ] Timeline de eventos del día (hardcoded ahora, API después)
  - [ ] Mostrar: hora, descripción, participante (avatar)
  - [ ] Ejemplo: 09:00 Contactar Laura, 11:00 Clase Mateo, 15:00 Seguimiento Sofia
- **Dependencias:** Ninguna (MVP con datos hardcoded)
- **Tiempo est:** 1.5 horas

**Tarea 3.3: Crear panel "Embudo Comercial"**
- **Archivo:** `components/admin/commercial-funnel-panel.tsx` (nueva)
- **Cambios:**
  - [ ] Tabla mostrando 6 etapas: Nuevo, Contactado, Clase agendada, Clase realizada, Matriculado, Perdido
  - [ ] Para cada etapa: número + % cambio vs mes anterior + color indicador
  - [ ] Pie chart de distribución
- **Dependencias:** Endpoint `/api/admin/funnel-stats`
- **Tiempo est:** 2–3 horas

---

### Fase 4: Automatizaciones y Agentes (MEDIUM PRIORITY)

**Tarea 4.1: Crear panel "Automatizaciones"**
- **Archivo:** `components/admin/automations-panel.tsx` (nueva)
- **Cambios:**
  - [ ] Lista de 4 automatizaciones con toggles on/off
    - Hot Lead Alert
    - Daily Digest
    - Follow-up Recordatorio
    - Sincronización Twenty CRM
  - [ ] Mostrar: nombre, estado, última ejecución, próxima ejecución
- **Dependencias:** Endpoint `/api/admin/automations`
- **Tiempo est:** 2 horas

**Tarea 4.2: Crear panel "Agentes Opsly"**
- **Archivo:** `components/admin/opsly-agents-panel.tsx` (nueva)
- **Cambios:**
  - [ ] Grid de agentes mostrando: icono, nombre, estado (Disponible/Trabajando/En espera)
  - [ ] Agregar 6 agentes: Operations, Sales, QA, Research, Planner, Support
  - [ ] Mostrar descripción breve de cada agente
- **Dependencias:** Ninguna (MVP con datos estáticos)
- **Tiempo est:** 1.5 horas

**Tarea 4.3: Crear panel "System Health" (Salud del sistema)**
- **Archivo:** `components/admin/system-health-panel.tsx` (nueva)
- **Cambios:**
  - [ ] Tabla de servicios con estado (OK/⚠️/❌)
    - Orchestrator
    - LLM Gateway
    - Event Bus
    - Workers
    - Base de datos
    - n8n
    - Twenty CRM
  - [ ] Endpoint para fetch status real (o simulado)
- **Dependencias:** Endpoint `/api/admin/system-health`
- **Tiempo est:** 2 horas

---

### Fase 5: Layout y composición final (MEDIUM PRIORITY)

**Tarea 5.1: Refactorizar admin/page.tsx para combinar panels**
- **Archivo:** `app/admin/page.tsx` (mejorar)
- **Cambios:**
  - [ ] Elegir layout: 
    - **Option A (Image 1):** Full Kanban con KPIs arriba + gráfico abajo
    - **Option B (Image 2):** Atención Inmediata + Operación + Funnel + Agentes (dashboard simplificado)
  - [ ] Crear dos vistas: Toggle button "Vista Kanban" vs "Vista Ejecutiva"
  - [ ] Responsive design: stacked en mobile, grid en desktop
- **Dependencias:** Todas las tareas anteriores
- **Tiempo est:** 2–3 horas

**Tarea 5.2: Mejorar estilos y tema**
- **Archivos:** `tailwind.config.ts`, `components/admin/*.tsx`
- **Cambios:**
  - [ ] Asegurar colores consistentes (tema dark/light)
  - [ ] Spacing y padding uniformes
  - [ ] Iconos de Lucide React para KPIs y agentes
  - [ ] Animaciones suaves en KPIs y transiciones
- **Dependencias:** Todas las tareas anteriores
- **Tiempo est:** 2–3 horas

---

## 📊 Timeline de ejecución

| Fase | Tareas | Est. horas | Prioridad |
|------|--------|-----------|-----------|
| 1 | KPIs y Header | 8–10h | 🔴 HIGH |
| 2 | Pipeline Kanban | 5–7h | 🔴 HIGH |
| 3 | Atención Inmediata | 5–6h | 🟡 MEDIUM |
| 4 | Automatizaciones + Agentes | 5–6h | 🟡 MEDIUM |
| 5 | Layout + Estilos | 4–6h | 🟡 MEDIUM |
| | **TOTAL** | **27–35h** | |

**Recomendación:** Ejecutar Fase 1 + 2 primero (13–17h, 1–2 días de intenso), luego Fase 3–5 en paralelo con iteraciones de diseño.

---

## 🛠️ Comandos útiles para Cursor

```bash
# Verificar branch
git status

# Ver cambios actuales
git diff --stat

# Type-check antes de commit
npm run type-check

# Build para verificar errores
npm run build

# Dev server para testing
npm run dev

# Commit y push
git add -A
git commit -m "feat(peskids): <task number> <description>"
git push origin claude/peskids-cursor-avance-1ortri

# Ver rama y tema
bash scripts/git-session-brief.sh
```

---

## ✅ Checklist de completitud

- [ ] Header renovado con búsqueda y notificaciones
- [ ] KPI strip con 4 tarjetas + tendencias
- [ ] Endpoint `/api/admin/kpis` funcionando
- [ ] Pipeline Kanban mejorado con 5 columnas
- [ ] Gráfico de rendimiento del pipeline
- [ ] Endpoint `/api/admin/pipeline-stats` funcionando
- [ ] Panel "Atención Inmediata" con 4 tarjetas
- [ ] Panel "Operación de hoy" con timeline
- [ ] Panel "Embudo Comercial" con conversiones
- [ ] Panel "Automatizaciones" con toggles
- [ ] Panel "Agentes Opsly" con grid de agentes
- [ ] Panel "System Health" con estados
- [ ] Dos vistas disponibles (Kanban + Ejecutiva)
- [ ] Responsive design verificado
- [ ] Temas dark/light aplicados
- [ ] CI/CD green (type-check, build)
- [ ] PR abierto y listo para review

---

## 📝 Notas para Cursor

1. **Reutiliza componentes:** Antes de crear nuevo, revisa `components/admin/` — hay mucho base ya.
2. **Colores:** Usa Tailwind defaults o define en `tailwind.config.ts` si necesita custom.
3. **Datos:** Comienza con hardcoded, luego agrega endpoints cuando sea necesario.
4. **Testing:** `npm run type-check` después de cada tarea. Evita `any` types.
5. **Commits:** Uno por tarea completada. Sé específico en el mensaje.
6. **Feedback:** Cuando completes una fase, actualiza este archivo con status real.

---

## 🔗 Referencias externas

- Mockup Image 1 (Kanban completo): `/root/.claude/uploads/.../a36c333a-...png`
- Mockup Image 2 (Ejecutiva simplificada): `/root/.claude/uploads/.../dff8b492-...png`
- Componentes existentes: `apps/peskids/components/admin/`
- DB Schema: `docs/tenants/peskids/DATA-MODEL.md`
- API patterns: `apps/peskids/app/api/`

---

**Last updated:** 2026-08-07 by Claude  
**Rama:** `claude/peskids-cursor-avance-1ortri`  
**Contact:** cboteros1@gmail.com
