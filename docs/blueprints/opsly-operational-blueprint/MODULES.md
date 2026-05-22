---
status: draft
owner: product
last_review: 2026-05-19
---

# Opsly Operational Blueprint — Modules

Módulos **reutilizables** entre nichos. Combinar 3–5 en un MVP; no implementar los 10 a la vez.

## Resumen

| Módulo | Riesgo | MVP default |
|--------|--------|-------------|
| Lead Capture | Bajo | Sí |
| Feedback Loop | Bajo | Sí |
| Follow-up Workflow | Medio | Sí |
| Simple CRM View | Bajo | Sí |
| Parent/Customer Dashboard | Medio | MVP+1 |
| Content Workflow | Medio | Opcional |
| Weekly Report | Bajo | Sí |
| AI Draft Assistant | Medio | Opcional (draft) |
| Approval Queue | Bajo | Sí |
| Tenant Extraction Pack | Bajo | Al extraer |

---

## Lead Capture

| | |
|-|-|
| **Purpose** | Registrar interés desde web, form o referido sin perder contactos. |
| **Inputs** | Form webhook, CSV manual, mensaje estructurado |
| **Outputs** | Registro `lead`, notificación owner, evento `lead.created` |
| **Tools** | n8n, Supabase, email/Discord |
| **Risk** | Bajo |
| **Manual** | Calidad del dato, descarte spam, asignación comercial |
| **Automate later** | Scoring IA, dedupe avanzado, enriquecimiento |

---

## Feedback Loop

| | |
|-|-|
| **Purpose** | Capturar opinión de padres/clientes/pacientes con trazabilidad. |
| **Inputs** | Formulario, email reenviado, encuesta corta |
| **Outputs** | Registro `feedback`, alerta si rating bajo |
| **Tools** | n8n, DB, notificaciones |
| **Risk** | Bajo |
| **Manual** | Respuesta al cliente, escalación |
| **Automate later** | Sentiment IA (sugerencia), routing por tema |

---

## Follow-up Workflow

| | |
|-|-|
| **Purpose** | Nada pendiente se olvida (llamadas, emails, visitas). |
| **Inputs** | Reglas de días sin contacto, leads estancados |
| **Outputs** | Lista `followup.pending`, recordatorios |
| **Tools** | n8n cron, DB |
| **Risk** | Medio (spam interno si mal configurado) |
| **Manual** | Cierre real del follow-up |
| **Automate later** | Auto-crear tareas desde IA (con aprobación) |

---

## Simple CRM View

| | |
|-|-|
| **Purpose** | Una pantalla o hoja con pipeline simple (no Salesforce). |
| **Inputs** | Tabla leads + estados |
| **Outputs** | Vista filtrada, export CSV |
| **Tools** | Portal, Retool, Supabase Studio, Notion (transitorio) |
| **Risk** | Bajo |
| **Manual** | Cambio de estado |
| **Automate later** | Dashboard Next dedicado |

---

## Parent/Customer Dashboard

| | |
|-|-|
| **Purpose** | Rol limitado para padres/clientes (horarios, feedback, pagos futuros). |
| **Inputs** | Auth por usuario, RLS |
| **Outputs** | UI read-mostly + forms acotados |
| **Tools** | Next.js, Supabase Auth |
| **Risk** | Medio (PII, soporte) |
| **Manual** | Soporte, altas/bajas |
| **Automate later** | Notificaciones in-app |

---

## Content Workflow

| | |
|-|-|
| **Purpose** | Ideas → borrador → aprobación → publicación. |
| **Inputs** | Notas reunión, fotos, ideas staff |
| **Outputs** | `content_ideas`, borrador IA |
| **Tools** | n8n, LLM API, calendar |
| **Risk** | Medio (marca reputacional) |
| **Manual** | Aprobación y publicación |
| **Automate later** | Programación redes (solo post-approval) |

---

## Weekly Report

| | |
|-|-|
| **Purpose** | Foto semanal para el dueño (leads, feedback, pendientes, uptime). |
| **Inputs** | Agregados DB + métricas n8n/uptime |
| **Outputs** | Email/PDF, evento `report.weekly.generated` |
| **Tools** | n8n, plantilla HTML |
| **Risk** | Bajo |
| **Manual** | Revisión antes de envío |
| **Automate later** | Narrativa IA del informe (borrador) |

---

## AI Draft Assistant

| | |
|-|-|
| **Purpose** | Acelerar redacción sin enviar automáticamente. |
| **Inputs** | Contexto feedback/lead, política [SECURITY-AND-TRUST.md](./SECURITY-AND-TRUST.md) |
| **Outputs** | Texto en estado `draft` |
| **Tools** | LLM Gateway, OpenAI/Claude/Ollama |
| **Risk** | Medio |
| **Manual** | Edición y envío |
| **Automate later** | Ninguno sin cambio de política |

---

## Approval Queue

| | |
|-|-|
| **Purpose** | Cola única de “cosas que requieren OK humano”. |
| **Inputs** | Borradores IA, mensajes propuestos, cambios sensibles |
| **Outputs** | `approved` / `rejected` + auditoría |
| **Tools** | DB table, UI mínima, Discord opcional |
| **Risk** | Bajo |
| **Manual** | Toda aprobación |
| **Automate later** | Recordatorios de cola vieja |

---

## Tenant Extraction Pack

| | |
|-|-|
| **Purpose** | Paquete documental y técnico para salir de Opsly incubator. |
| **Inputs** | Docs tenant, DATA-MODEL, workflows export, event contract |
| **Outputs** | Repo semilla, checklist extracción |
| **Tools** | Git, scripts copy-only |
| **Risk** | Bajo si se planifica |
| **Manual** | Cutover DNS, migración datos |
| **Automate later** | Generador de repo desde plantilla |

---

## Composición MVP recomendada (PyME)

1. Lead Capture  
2. Feedback Loop  
3. Follow-up Workflow  
4. Simple CRM View  
5. Weekly Report  
6. Approval Queue  

Opcional: AI Draft Assistant (solo drafts).

Ver [IMPLEMENTATION-CHECKLIST.md](./IMPLEMENTATION-CHECKLIST.md).
