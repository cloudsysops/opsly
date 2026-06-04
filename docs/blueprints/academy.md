# Academy Growth Blueprint V1

## Objetivo

Ayudar a academias, escuelas, cursos, entrenadores y centros educativos a:

- Capturar leads
- Automatizar seguimiento
- Convertir clases de prueba en alumnos activos
- Medir resultados

## Posicionamiento operativo

- GHL se usa como capa operacional
- Opsly se usa como capa de inteligencia y visibilidad
- El blueprint debe funcionar sin construir un CRM completo dentro de Opsly

## Pipeline

1. Nuevo Lead
2. Contactado
3. Interesado
4. Clase de Prueba Agendada
5. Clase de Prueba Completada
6. Inscripcion Pendiente
7. Alumno Activo
8. No Interesado

## Lead Sources

- Instagram
- Facebook
- Website
- Referral
- WhatsApp
- Google Business

## Tags

- `academy_lead`
- `academy_trial`
- `academy_parent`
- `academy_student`
- `academy_active`
- `academy_lost`
- `academy_referral`
- `academy_whatsapp`
- `academy_instagram`
- `academy_facebook`

## Custom Fields

- Student Name
- Parent Name
- Student Age
- Program Interest
- Preferred Schedule
- Trial Class Date
- Enrollment Date
- Source Detail

## Forms

### Free Trial Form

- Nombre
- Teléfono
- Email
- Edad
- Programa
- Horario Preferido
- Consentimiento

## Workflows

### Workflow 1: Lead Intake

Trigger:

- Form Submitted

Actions:

- Create Opportunity
- Assign Tag
- Send Welcome SMS
- Send Welcome Email
- Notify Team

### Workflow 2: Trial Reminder

Timing:

- 24h antes
- 3h antes
- 30 min antes

### Workflow 3: Post Trial Follow-Up

Flow:

- Clase completada
- Feedback
- Oferta de inscripcion
- Seguimiento automatico

### Workflow 4: Enrollment Success

Flow:

- Alumno inscrito
- Move Stage
- Tag Active
- Welcome Email
- Notify Team

## Dashboard

Métricas mínimas del executive v0:

- Leads Nuevos
- Clases Prueba
- Inscripciones
- Alumnos Activos
- Conversion
- Fuente de Captacion
- Ingresos

## Snapshot Contents

- Pipelines
- Tags
- Custom Fields
- Forms
- Calendars
- Email Templates
- SMS Templates
- Workflows
- Dashboard Widgets
- Branding

## Resultado esperado

Cliente nuevo:

- Import Snapshot
- Academia funcionando en horas en lugar de semanas

## Lo que no se debe construir

- No crear un CRM completo dentro de Opsly
- No construir motores de WhatsApp, email o calendar dentro de Opsly
- No agregar IA avanzada en este slice
- No agregar mas de los flujos y metricas definidos aqui

## Notas de implementacion

- Mantener la marca visible del cliente como capa front-facing
- Mantener Opsly como capa de control, lectura y alertas
- Mantener el tenant scope minimo y reutilizable

