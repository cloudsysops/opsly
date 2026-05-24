---
status: ready
owner: growth
last_review: 2026-05-08
---

# Agency Pilot Outreach — Opsly Dev Agency OS

## Objetivo

Listar 20 agencias/consultores objetivo y preparar una primera ola de 5 contactos para validar el piloto **Opsly Managed Agent Delivery Desk**.

## Oferta a Enviar

"Tu agencia mantiene Cursor/VS Code/GitHub. Opsly coordina agentes supervisados, terminales, PRs, validaciones y reportes para cerrar tareas repetitivas mas rapido sin contratar mas developers."

## Segmento

- Agencias de 3 a 20 personas.
- Entregan SaaS internos, automatizaciones, integraciones, n8n, soporte web o DevOps ligero.
- Ya usan GitHub y tienen backlog de cambios pequenos.
- Tienen dolor por contexto perdido, PRs lentos o soporte repetitivo.

## Lista de 20 Objetivos

| # | Contacto | Empresa | Foco | Region | Prioridad | Estado |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Maria Garcia | Agencia X | ecommerce | LATAM | Alta | primera ola |
| 2 | Carlos Lopez | Digital Pro | marketing automation | LATAM | Alta | primera ola |
| 3 | Ana Martinez | Creative Studio | web design | LATAM | Alta | primera ola |
| 4 | Roberto Silva | DataDriven Solutions | data analytics | LATAM | Alta | primera ola |
| 5 | Sofia Rodriguez | CloudNative Experts | cloud infrastructure | LATAM | Alta | primera ola |
| 6 | Diego Fernandez | Automation Hub | workflow automation | LATAM | Media | pendiente |
| 7 | Marcela Gomez | Agencia Technology | custom development | LATAM | Media | pendiente |
| 8 | Pablo Ramirez | Integration Pros | API integration | LATAM | Media | pendiente |
| 9 | Alejandra Moreno | Mobile First Agency | mobile development | LATAM | Media | pendiente |
| 10 | Fernando Juarez | SEO Experts | digital marketing | LATAM | Media | pendiente |
| 11 | Gabriela Sanchez | Content Masters | content management | LATAM | Media | pendiente |
| 12 | Javier Castillo | Design Innovation Lab | UI/UX design | LATAM | Media | pendiente |
| 13 | Valentina Torres | Business Process Solutions | process automation | LATAM | Alta | pendiente |
| 14 | Manuel Herradura | Security First Consulting | cybersecurity | LATAM | Alta | pendiente |
| 15 | Catalina Flores | Enterprise Solutions Inc | enterprise consulting | LATAM | Alta | pendiente |
| 16 | Laura Rios | StudioOps | maintenance retainers | LATAM | Alta | pendiente investigacion |
| 17 | Nicolas Perez | SaaS Builders Co | SaaS MVPs | LATAM | Alta | pendiente investigacion |
| 18 | Camila Duarte | Automata Labs | n8n and Zapier | LATAM | Alta | pendiente investigacion |
| 19 | Andres Molina | DevRel Partners | integrations | LATAM | Media | pendiente investigacion |
| 20 | Paula Castro | Product Sprint Studio | productized services | LATAM | Media | pendiente investigacion |

> Los primeros 15 objetivos existen en `data/growth/tier1-targets.json`. Los ultimos 5 son perfiles de prospeccion para investigar antes de enviar email real.

## Primera Ola: 5 Contactos

| Contacto | Motivo | Mensaje |
| --- | --- | --- |
| Maria Garcia / Agencia X | Ecommerce genera tareas repetitivas de soporte, catalogo e integraciones | "Podemos convertir cambios pequenos de ecommerce en PRs validados con agentes supervisados." |
| Carlos Lopez / Digital Pro | Marketing automation encaja con n8n, integraciones y backlog operativo | "Opsly coordina agentes y terminales para automatizaciones sin perder control humano." |
| Ana Martinez / Creative Studio | Web design tiene alto volumen de cambios pequenos y QA visual | "Tu equipo conserva el IDE; Opsly gestiona issue -> PR -> reporte." |
| Roberto Silva / DataDriven Solutions | Data/analytics exige trazabilidad y validacion | "Agentes con contexto, validacion y evidencia para integraciones de datos." |
| Sofia Rodriguez / CloudNative Experts | DevOps ligero y cloud infra requieren runbooks y limites | "Piloto de 14 dias para medir ahorro en tareas repetitivas y soporte." |

## Email Base

Asunto:

```text
Piloto Opsly: agentes supervisados para cerrar tareas de agencia mas rapido
```

Cuerpo:

```text
Hola {nombre},

Estoy validando Opsly Managed Agent Delivery Desk para agencias que ya usan GitHub, Cursor/VS Code y herramientas de automatizacion.

La idea no es cambiar el stack de {empresa}. Opsly funciona como mesa de entrega: toma una solicitud, prepara contexto, asigna un agente supervisado, ejecuta en IDE/terminal, abre diff/PR, valida y deja reporte para el cliente.

Busco 5 agencias para un piloto de 14 dias con alcance acotado:
- 1 repo
- hasta 5 tareas repetitivas
- PRs supervisados
- reporte de horas ahorradas, validaciones y costo IA

Si te interesa, te muestro una demo de 15 minutos con un flujo issue -> agente -> PR -> reporte.

Carlos
Opsly
```

## Secuencia de Contacto

1. Dia 0: email base personalizado.
2. Dia 2: follow-up corto con una pregunta: "Que tarea repetitiva consume mas tiempo a tu equipo?"
3. Dia 5: enviar ejemplo de demo o captura del flujo.
4. Dia 7: cerrar hilo si no hay respuesta.

## Ejecucion Segura

No enviar emails reales hasta confirmar dominio Resend y remitente. Para previsualizar:

```bash
node scripts/test-growth-outreach.mjs
```

Para dry-run:

```bash
doppler run --project ops-intcloudsysops --config prd -- ./scripts/growth-outreach.sh --dry-run
```

Para envio real, usar solo contactos verificados y dominio Resend validado:

```bash
doppler run --project ops-intcloudsysops --config prd -- ./scripts/growth-outreach.sh
```

## Criterio de Hecho

- 20 objetivos documentados.
- 5 contactos priorizados para primera ola.
- Mensaje base listo.
- Secuencia de follow-up lista.
- Comandos de preview/dry-run/envio documentados.
- Estado de seguridad claro: no enviar si Resend/domain no esta verificado.

---

## Enlaces relacionados

- [[brain/README|brain]]
- [[brain/README|Brain Central]]
