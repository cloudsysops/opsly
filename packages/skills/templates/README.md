---
title: 'Templates Index'
description: 'Colección de templates reutilizables para el proyecto Opsly'
category: templates
tags: [templates, boilerplate, documentation]
created_at: 2026-04-15
updated_at: 2026-04-15
---

# Plantillas Reutilizables

Colección de templates para estandarizar el desarrollo en Opsly. Cada template incluye frontmatter, comentarios explicativos, ejemplos I/O, y checklist de validación.

## Índice de Templates

| Template                                          | Descripción                               | Tags                              |
| ------------------------------------------------- | ----------------------------------------- | --------------------------------- |
| [template-api-route](./template-api-route.md)     | Rutas API con Fastify y tests Vitest      | `api`, `route`, `fastify`, `test` |
| [template-bash-script](./template-bash-script.md) | Scripts bash idempotentes con logging     | `bash`, `script`, `cli`, `devops` |
| [template-mcp-tool](./template-mcp-tool.md)       | Tools MCP con OAuth y autenticación       | `mcp`, `tool`, `oauth`, `claude`  |
| [template-migration](./template-migration.md)     | Migraciones SQL idempotentes con rollback | `sql`, `postgres`, `migration`    |
| [template-test](./template-test.md)               | Tests unitarios e integración con Vitest  | `vitest`, `test`, `unit`, `mock`  |

## Cómo Usar

1. **Copiar el template** deseado a la ubicación apropiada en el proyecto
2. **Reemplazar los placeholders** (marcados con `{{nombre}}`) con valores específicos
3. **Agregar la lógica de negocio** en las secciones indicated
4. **Ejecutar los checklists** de validación antes de commit

## Convenciones de Nombrado

- Los templates siguen el patrón: `template-[tipo].md`
- Los archivos generados siguen el patrón del proyecto existente
- Las migraciones usan formato: `000XXX_description.up.sql`

## Contribuir

Para agregar un nuevo template:

1. Crear archivo en `/opt/opsly/skills/templates/template-[nombre].md`
2. Incluir frontmatter con metadatos
3. Agregar estructura, ejemplos y checklist
4. Actualizar este README con el nuevo template
