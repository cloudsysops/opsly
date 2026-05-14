---
status: canon
owner: operations
last_review: 2026-05-10
---

# Obsidian como “cerebro” con fuentes verificadas (web + navegador)

Tu grafo mezcla **hubs densos** y **muchos nodos sueltos**. Eso es normal si importas o capturas mucho sin **enlaces obligatorios** y sin **notas fuente** estandarizadas. Este documento define un flujo mínimo para que Obsidian sea un cerebro **con trazabilidad**: cada idea nueva llega con **origen**, **enlaces ascendentes** y **revisión**.

## Principios (3 capas)

| Capa | Carpeta sugerida | Rol |
|------|-------------------|-----|
| **Inbox** | `obsidian/inbox/` | Captura rápida sin pulir (fecha o tema). |
| **Fuente** | `obsidian/sources/` | Una nota por documento/URL: qué dice, qué no sabemos, enlaces. |
| **Síntesis** | `brain/`, `research/` o tema propio | Ideas atómicas (`[[...]]`) enlazadas a fuentes y a un **MOC**. |

Regla anti-huérfanos: **toda nota nueva** debe enlazar al menos **un MOC** (`[[MOC - Tema]]`) y **una fuente** o **otra nota** del mismo tema.

## Rol de Cursor (Web search + Browser)

En Cursor puedes pedir investigación con herramientas de red y navegador. El flujo recomendado:

1. Abrís el vault: carpeta `docs/` en Obsidian; en Cursor, el repo `intcloudsysops`.
2. Pedís al agente **explícitamente** que use búsqueda web y, si hace falta, el navegador (MCP) para **abrir y comprobar** la página, no solo el snippet de búsqueda.
3. El agente **escribe o actualiza** un archivo bajo `docs/obsidian/sources/` usando la plantilla `source-note` (ver `.obsidian/templates/`).
4. Vos (o el agente) enlazás esa fuente desde el **MOC** del tema y desde **1–2 notas de síntesis** en `docs/brain/` o `docs/research/`.

### Prompt copiable (Cursor)

Copiá y adaptá `TEMA` y `PREGUNTA`:

```text
Investigación para vault Obsidian (repo docs/):

TEMA: <tema>
PREGUNTA: <qué querés resolver>

Hacé:
1) Búsqueda web con varias consultas; priorizá fuentes primarias, documentación oficial o papers.
2) Si hace falta verificación (login, tablas, JS), usá el navegador (MCP) en las URLs relevantes.
3) Creá o actualizá UNA nota fuente en docs/obsidian/sources/ con nombre slug kebab-case:
   docs/obsidian/sources/YYYY-MM-DD-<slug-corto>.md
   Siguiendo la estructura de docs/.obsidian/templates/source-note.md (frontmatter + secciones).
4) En la nota, listá "Claims" como bullets con [confianza: alta/media/baja] según evidencia.
5) Añadí al final wikilinks a:
   - el MOC del tema: [[index]] o el MOC que indique el usuario
   - 1–2 notas existentes en docs/brain/ o docs/research/ si encajan (buscá en el repo antes).
6) No inventes URLs; si no hay fuente, decilo en la nota.

Idioma de la nota: español (o el que pida el usuario).
```

## En Obsidian (humano)

1. **Plugins:** Obsidian Git (sync) + recomendado **Templater** o **Templates** core para insertar `source-note.md`.
2. **Graph:** filtrá por carpeta `obsidian/sources` y enlazá manualmente hubs que queden sueltos.
3. **MOCs:** mantené un índice por dominio (p. ej. `docs/brain/README.md` ya es hub); creá `docs/obsidian/moc-<tema>.md` si un tema crece.

## Conexión con Opsly (agentes)

- Índice repo para agentes: `npm run index-knowledge` / `config/knowledge-index.json` (no sustituye el vault; complementa).
- Estado del sistema Obsidian + scripts: [`OBSIDIAN-KNOWLEDGE-SYSTEM-STATUS.md`](OBSIDIAN-KNOWLEDGE-SYSTEM-STATUS.md).

## Referencias

- [`OBSIDIAN-README.md`](OBSIDIAN-README.md) — apertura del vault y atajos.
- [`PLUGINS-TO-INSTALL.md`](../.obsidian/PLUGINS-TO-INSTALL.md) — Dataview/Templater opcionales.
- Plantillas: `docs/.obsidian/templates/source-note.md`, `evergreen-claim.md`, `moc-research.md`.
