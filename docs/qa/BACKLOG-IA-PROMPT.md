---
status: canon
owner: qa
last_review: 2026-05-03
---

# Prompt IA — De hallazgos QA a backlog ejecutable (Cursor)

## Uso

1. El tester entrega tablas según [`TESTER-CHECKLIST.md`](TESTER-CHECKLIST.md).
2. Pegas **todas las tablas** + el bloque **§ Prompt para la IA** (abajo) en Claude / Cursor Chat.
3. La salida debe incluir: deduplicación, priorización, mapping a `apps/*`, orden de implementación, y **un prompt por ticket S1–S2** para pegar en Cursor Agent.

---

## Definición de listo (DoD) por severidad

Ajustad los umbrales de cobertura a lo que exija vuestro CI real (`npm run test --workspace=…`).

### S1 (Crítico)

- [ ] Fix mergeado vía **PR** a `main` (no force-push a `main`).
- [ ] `npm run type-check` en verde (o al menos workspaces tocados).
- [ ] Tests del workspace afectado en verde **si existen**; si no hay tests, issue de deuda “añadir test mínimo” enlazado.
- [ ] QA re-verifica en **staging** (o ambiente donde se reprodujo).

### S2 (Alto)

- [ ] Mismo que S1; además **lint** del workspace si aplica (`npm run lint --workspace=@intcloudsysops/portal`, etc.).
- [ ] Spot-check en staging de la pantalla afectada.

### S3 (Medio)

- [ ] Mergeado o backlog explícito para siguiente sprint.

### S4 (Bajo)

- [ ] Registrado en backlog de deuda / polish.

---

## § Prompt para la IA (copiar desde aquí)

```markdown
Actúa como lead frontend (Next.js 15, TypeScript estricto, monorepo Opsly).

## Entrada — hallazgos del tester

[Pegar aquí todas las tablas de hallazgos en el formato de docs/qa/TESTER-CHECKLIST.md]

## Tarea

1. **Deduplicación y priorización:** fusiona duplicados; ordena S1 → S4.
2. **Mapping a código:** para cada **S1 y S2**, indica `apps/web` | `apps/portal` | `apps/admin` y **ruta(s) de archivo probable(s)** (heurística desde la ruta UI y el nombre del componente; si dudas, dilo).
3. **Dependencias:** tabla `Hallazgo | Depende de`.
4. **Orden de implementación:** lista numerada (bloqueantes primero).
5. **Prompts para Cursor:** un bloque por **S1–S2** con:
   - Criterio de hecho (checkboxes).
   - Pasos técnicos (archivos, cambio esperado).
   - Comandos de verificación: al menos `npm run type-check` y, si aplica, `npm run test --workspace=@intcloudsysops/<api|portal|admin>` y `npm run lint --workspace=…`.
6. Si falta información para decidir, lista **preguntas mínimas** al tester (no inventes comportamiento).

Restricciones: Supabase Auth (no Clerk/Auth0); no inventes secretos; no asumas credenciales.
```

---

## Plantilla — Prompt para Cursor (la IA debe generar uno por S1–S2)

```markdown
## Prompt para Cursor — [<ID>: título breve>]

**Contexto:** Hallazgo QA [<S1|S2>] en [<app>] ruta [<ruta>] ambiente [<env>].

**Criterio de hecho:**
- [ ] Comportamiento corregido según “esperado” del hallazgo.
- [ ] Sin regresiones obvias en rutas vecinas.
- [ ] `npm run type-check` OK (workspaces tocados).
- [ ] Tests o lint del workspace si existen en CI para esa área.

**Pasos sugeridos:**
1. Localizar componente/página en `apps/<web|portal|admin>/...`.
2. Aplicar el mínimo cambio necesario (sin refactors masivos).
3. Validar en local o staging.

**Evidencia esperada:** captura o nota de verificación + salida de comandos relevantes.
```
