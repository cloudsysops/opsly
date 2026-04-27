# Opsly Skill Creator

> **Triggers:** `crear skill`, `nueva skill`, `skill creator`, `automatizar proceso`, `capturar workflow`, `skill from`, `turn into skill`
> **Priority:** CRITICAL
> **Skills relacionados:** `opsly-quantum`, `opsly-context`, todos

## Cuándo usar

Usar **siempre** que:

- Un agente o usuario identifique un proceso repetitivo que debería automatizarse
- Se quiera crear una nueva skill desde cero
- Se quiera mejorar o iterar sobre una skill existente
- Un hallazgo de QA/audit sugiera un workflow que debería capturarse
- Se diga "esto debería ser una skill" o "turn this into a skill"

## Filosofía

Los agentes de Opsly operan en un ecosistema donde **cada proceso recurrente debería ser una skill**. Cuando un agente resuelve un problema complejo, diagnostica un sistema, o ejecuta un workflow multi-paso, debe preguntarse: "esto que hice puede beneficiar a futuras sesiones?" Si la respuesta es sí, crea la skill.

Las skills son la **memoria ejecutable** de Opsly — no documentación pasiva, sino instrucciones que los agentes pueden seguir para reproducir resultados consistentes.

---

## Proceso de Creación

### Regla 0 (obligatoria): Reusar antes de crear

Antes de crear cualquier skill nueva:

1. Buscar en `skills/index.json` y `skills/user/` skills existentes.
2. Si existe una skill adecuada al caso (match suficiente), **reusar y mejorar** esa skill.
3. Solo crear skill nueva cuando no haya match suficientemente específico.

Heurística recomendada:

- `score >= 20` en `scripts/skill-finder.js` -> reusar skill existente.
- `score < 20` o sin match -> crear o extender skill con este módulo.

### Paso 1: Capturar Intención

Entender qué debería hacer la skill. Si la conversación ya contiene un workflow (ej. "convierte esto en una skill"), extraer:

- Tools usados y secuencia de pasos
- Correcciones del usuario durante el proceso
- Formatos de input/output observados
- Condiciones de éxito

Preguntas clave:

1. Qué debería permitirle hacer a Claude esta skill?
2. Cuándo debería activarse? (frases, contextos)
3. Cuál es el formato de output esperado?
4. Se beneficiaría de test cases para verificar que funciona?

### Paso 2: Investigar y Recopilar Contexto

- Revisar skills existentes en `skills/user/` para evitar duplicados
- Buscar patrones similares en el codebase
- Verificar dependencias (Supabase, APIs, scripts existentes)
- Identificar edge cases y formatos

### Paso 2.1: Organizar por módulo (para búsqueda rápida)

Si se crea una skill nueva, debe quedar en un módulo claro del índice:

- `frontend` (portal/admin/web)
- `development` (api/lógica backend)
- `database` (supabase/sql/rls)
- `operations` (infra/vps/deploy/tenant)
- `orchestration` (orchestrator/oar/n8n)
- `billing` (stripe/subscriptions/metering)
- `qa` (tests/smoke/audit)
- `integration` (mcp/oauth/externos)
- `ai` (llm/routing/cache)
- `architecture` (adr/decisiones)
- `tooling` (meta-skills/herramientas internas)

### Paso 3: Escribir la Skill

#### Estructura de archivos

```
skills/user/<skill-name>/
├── SKILL.md          (requerido) — instrucciones principales
├── manifest.json     (requerido) — metadata y schemas
├── scripts/          (opcional)  — scripts ejecutables para tareas determinísticas
├── references/       (opcional)  — docs cargados en contexto según necesidad
└── assets/           (opcional)  — templates, archivos usados en output
```

#### SKILL.md — Formato Opsly

```markdown
# Opsly <Nombre> Skill

> **Triggers:** `keyword1`, `keyword2`, `keyword3`
> **Priority:** CRITICAL | HIGH | MEDIUM | LOW
> **Skills relacionados:** `opsly-xxx`, `opsly-yyy`

## Cuándo usar

Describir cuándo activar esta skill y el contexto esperado.

## [Secciones de instrucciones]

Instrucciones claras, imperativas, con el "por qué" detrás de cada paso.

## Reglas

- Reglas absolutas de la skill

## Errores comunes

| Error | Causa | Solución |
| ----- | ----- | -------- |
```

#### manifest.json — Formato Opsly

```json
{
  "name": "opsly-<nombre>",
  "version": "1.0.0",
  "description": "Descripción corta y clara",
  "inputSchema": {
    "type": "object",
    "properties": {},
    "additionalProperties": true
  },
  "outputSchema": {
    "type": "object",
    "properties": {}
  }
}
```

### Guía de Escritura

#### Descripción (triggering)

La descripción es el mecanismo principal de activación. Debe ser ligeramente "pushy" — incluir no solo qué hace la skill sino cuándo usarla, incluyendo sinónimos y contextos adyacentes. Claude tiende a sub-activar skills; contrarrestar esto con descripciones amplias.

Ejemplo malo: `"Crear migraciones SQL"`
Ejemplo bueno: `"Crear migraciones SQL, diseñar queries, modificar schema, agregar tablas, columnas, RLS policies, o cualquier cambio en la base de datos Supabase. Usar cuando se mencione SQL, postgres, migración, schema, database, pgvector, o cualquier operación de base de datos."`

#### Principios de escritura

1. **Explicar el por qué** — Claude es inteligente; explicar la razón es más efectivo que ALWAYS/NEVER en mayúsculas. Si te encuentras escribiendo en mayúsculas, refrámalo como razonamiento.

2. **Mantener SKILL.md < 500 líneas** — Si se acerca al límite, mover detalles a `references/` con punteros claros.

3. **Generalizar desde ejemplos** — La skill se usará miles de veces con prompts diferentes. No sobreajustar a los test cases específicos.

4. **Reutilizar scripts** — Si al probar la skill los agentes siempre escriben el mismo helper, ponerlo en `scripts/` y referenciarlo.

5. **Progressive disclosure** — Metadata siempre en contexto (~100 palabras), SKILL.md al activar (<500 líneas), references/ bajo demanda (ilimitado).

---

## Paso 4: Registrar en el Índice

Después de crear la skill, actualizar `skills/index.json`:

```json
{
  "name": "opsly-<nombre>",
  "version": "1.0.0",
  "description": "...",
  "category": "<category>",
  "priority": "<critical|high|medium|low>",
  "usage": "...",
  "triggers": ["keyword1", "keyword2"],
  "crossReferences": ["opsly-xxx"],
  "path": "skills/user/opsly-<nombre>/"
}
```

Categorías válidas: `bootstrap`, `master`, `architecture`, `development`, `ai`, `integration`, `database`, `operations`, `orchestration`, `notifications`, `optimization`, `qa`, `tooling`

## Paso 5: Test Cases (Opcional pero recomendado)

Para skills con outputs verificables (transforms, generación de código, workflows), crear 2-3 test prompts realistas:

```json
// skills/user/<skill-name>/evals/evals.json
{
  "skill_name": "opsly-<nombre>",
  "evals": [
    {
      "id": 1,
      "prompt": "Prompt realista de un usuario",
      "expected_output": "Descripción del resultado esperado",
      "files": []
    }
  ]
}
```

Ejecutar los prompts, revisar outputs, iterar la skill.

---

## Mejorar una Skill Existente

1. Leer la skill actual en `skills/user/<nombre>/SKILL.md`
2. Identificar qué falla o qué falta
3. Editar con los mismos principios de escritura
4. Si hay evals, re-ejecutar para verificar mejoras
5. Bump version en `manifest.json`

---

## Auto-Creación por Agentes

Cuando un agente identifica un proceso que debería ser skill, puede crearla autónomamente siguiendo este checklist:

- [ ] Verificar que no existe una skill similar en `skills/user/`
- [ ] Crear directorio `skills/user/opsly-<nombre>/`
- [ ] Escribir `SKILL.md` siguiendo el formato Opsly
- [ ] Escribir `manifest.json` con schemas
- [ ] Registrar en `skills/index.json`
- [ ] Actualizar CLAUDE.md si la skill es CRITICAL o HIGH
- [ ] Commit: `feat(skills): add opsly-<nombre> skill`

### Señales de que algo debería ser skill

- Un agente ejecuta >3 pasos para resolver algo que se repetirá
- Un hallazgo de QA/audit revela un gap que necesita proceso estándar
- El usuario dice "cada vez que hago X tengo que..."
- Un workflow se ejecuta de forma diferente en distintas sesiones
- Se detecta un patrón de errores recurrentes con la misma solución

---

## Referencia de Categorías

| Categoría     | Uso                                  |
| ------------- | ------------------------------------ |
| bootstrap     | Inicio de sesión, contexto           |
| master        | Orquestación, visión global          |
| architecture  | Decisiones, ADRs, riesgos            |
| development   | Código, APIs, scripts                |
| ai            | LLM, ML, modelos                     |
| integration   | MCP, servicios externos              |
| database      | SQL, migraciones, schema             |
| operations    | Tenants, deploy, uptime              |
| orchestration | Colas, jobs, paralelismo             |
| notifications | Discord, alertas                     |
| optimization  | Performance, Docker                  |
| qa            | Testing, auditoría, seguridad        |
| tooling       | Herramientas internas, skill-creator |

## Reglas

- Cada skill **debe** tener `SKILL.md` + `manifest.json`
- Nombres siempre con prefijo `opsly-`
- Sin `any` en TypeScript dentro de scripts
- Skills no deben contener secretos, exploits, o código malicioso
- Siempre registrar en `skills/index.json` tras crear

## Errores comunes

| Error               | Causa                           | Solución                                   |
| ------------------- | ------------------------------- | ------------------------------------------ |
| Skill no se activa  | Descripción muy estrecha        | Ampliar triggers y descripción en manifest |
| Skill duplicada     | No verificó existentes          | Revisar `skills/user/` antes de crear      |
| SKILL.md muy largo  | Toda la info en un archivo      | Mover detalles a `references/`             |
| Skill sobreajustada | Escrita para un caso específico | Generalizar instrucciones y ejemplos       |
