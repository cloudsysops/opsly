---
status: canon
owner: design + frontend
last_review: 2026-05-16
---

# Opsly — referencias de diseño

Índice único para diseño de producto (onboarding + dashboards) y handoff a desarrollo. **No duplicar tokens aquí** — inspeccionar en Claude Design o copiar a código/Figma según el flujo acordado con el equipo.

## Design system — fuente de verdad (live)

**Claude Design:** https://claude.ai/design/p/019e12ad-52ab-7464-acfe-2d6da6e12a81

- 10 artboards (6 onboarding + 4 dashboards)
- Sistema visual: color, tipografía, spacing, componentes
- Cambios en Claude Design se ven al instante en el navegador
- Inspección y export según las herramientas de Claude Design

**Uso recomendado:** compartir este enlace con diseño, producto y devs como referencia principal de especificación visual.

## Desarrollo — Figma (opcional)

| Estado | Notas |
| --- | --- |
| Opcional | Crear archivo Figma «Opsly Design System» si el equipo prefiere librería de componentes en Figma además del enlace live. |
| Handoff | Figma actúa como capa de implementación; Claude Design sigue siendo la fuente de verdad para cambios de diseño. |

Cuando exista el archivo Figma, añadir aquí la URL:

```text
Figma: (pendiente — pegar link del file)
```

## Enlaces rápidos (repo)

| Qué | Dónde | Propósito |
| --- | --- | --- |
| Especificación visual | [Claude Design](https://claude.ai/design/p/019e12ad-52ab-7464-acfe-2d6da6e12a81) | Artboards y tokens de diseño |
| Portal UI | [`apps/portal/`](../../apps/portal/) | Implementación Next.js |
| Tokens Tailwind (portal) | [`apps/portal/tailwind.config.ts`](../../apps/portal/tailwind.config.ts) | Colores, fuentes, tema en código |
| Componentes compartidos | [`LIBRARY-MODULES.md`](LIBRARY-MODULES.md) (`@intcloudsysops/components`) | Design system en código |
| Capa IA / rutas | [`IMPLEMENTATION-IA-LAYER.md`](IMPLEMENTATION-IA-LAYER.md) | Integración backend y agentes |
| Portal (rutas reales) | [`../00-architecture/`](../00-architecture/README.md) | Contratos y arquitectura estable |

## Flujo sugerido

### Equipo de diseño

1. Mantener cambios en **Claude Design** (enlace arriba).
2. Avisar a dev cuando haya release visual relevante.
3. Si usan Figma, sincronizar componentes/tokens desde Claude Design (manual o export).

### Equipo de desarrollo

1. Revisar artboards en Claude Design.
2. Alinear `apps/portal` (y admin si aplica) con tokens en `tailwind.config.ts` y `@intcloudsysops/components`.
3. Implementar pantallas según rutas existentes en `apps/portal/app/`.
4. Validar: `npm run type-check --workspace=@intcloudsysops/portal`, `npm run lint --workspace=@intcloudsysops/portal`.

## Opciones de handoff a Figma

| Opción | Cuándo | Esfuerzo |
| --- | --- | --- |
| **A — Solo Claude Design** | Equipo pequeño, iteración rápida | Mínimo — compartir enlace |
| **B — Figma espejo** | Dev team acostumbrado a Figma Dev Mode | Medio — replicar artboards y tokens |
| **C — Híbrido (recomendado)** | Diseño en Claude; dev inspecciona en Figma o enlace | Bajo en diseño; Figma opcional |

## Relacionado

- Wireframes admin costos: [`COST-DASHBOARD-WIREFRAMES.md`](COST-DASHBOARD-WIREFRAMES.md)
- Orquestación / producto: [`../design/`](../design/)
