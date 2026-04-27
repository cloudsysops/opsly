# NotebookLM Setup — Guía de instalación y uso

> **Última actualización:** 2026-04-14
> **Para agentes:** este doc te dice cómo configurar NotebookLM para queries operativas.

---

## 🎯 Qué es NotebookLM

NotebookLM (de Google) es un **asistente de investigación** con IA que:

- Resum documentos/PDFs/URLs
- Genera **podcasts** (Audio Overview) desde documentos
- Responde preguntas sobre tus fuentes
- **API no oficial** → `notebooklm-py` library

---

## 📋 Requisitos

| Requisito        | Detalle                                                         |
| ---------------- | --------------------------------------------------------------- |
| Plan             | **Business** o **Enterprise** (Startup no tiene acceso)         |
| Variable Doppler | `NOTEBOOKLM_ENABLED=true` en config `prd`                       |
| Credenciales     | Token Google con acceso a NotebookLM API                        |
| Notebook ID      | Crear notebook en notebooklm.google.com y guardar ID en Doppler |

---

## 🚀 Setup paso a paso

### 1. Verificar variables en Doppler

```bash
doppler secrets get NOTEBOOKLM_ENABLED --plain --project ops-intcloudsysops --config prd
doppler secrets get NOTEBOOKLM_NOTEBOOK_ID --plain --project ops-intcloudsysops --config prd
```

Si no existen:

```bash
doppler secrets set NOTEBOOKLM_ENABLED=true --project ops-intcloudsysops --config prd
```

### 2. Crear notebook en NotebookLM

1. Ir a [notebooklm.google.com](https://notebooklm.google.com)
2. Crear nuevo notebook
3. Añadir fuentes iniciales (AGENTS.md exportado, system_state.json)
4. Copiar **Notebook ID** de la URL: `https://notebooklm.google.com/notebook/<ID>`

### 3. Guardar Notebook ID en Doppler

```bash
doppler secrets set NOTEBOOKLM_NOTEBOOK_ID=<ID_AQUI> --project ops-intcloudsysops --config prd
```

### 4. Instalar dependencies (si ejecutas localmente)

```bash
pip install notebooklm-py
# o
npm install notebooklm (si existe wrapper TS)
```

---

## 🔧 Scripts disponibles

### Query al notebook

```bash
# Query básica
node scripts/query-notebooklm.mjs "¿Cuál es el estado actual de Opsly?"

# Query con contexto específico
node scripts/query-notebooklm.mjs "¿Qué errores hay en el VPS?"
```

### Sync automático (post-commit)

```bash
# En el hook .githooks/post-commit
npm run update-state  # regenera knowledge-index.json
```

### Generar podcast desde doc

```python
# apps/notebooklm-agent/src/workflows/report-to-podcast.py
python apps/notebooklm-agent/src/workflows/report-to-podcast.py \
  --input /tmp/reporte.pdf \
  --tenant localrank \
  --output /tmp/localrank-podcast.mp3
```

---

## 🎤 Casos de uso

### 1. Resumen operativo (diario)

```bash
# Exportar AGENTS.md a texto
cat AGENTS.md > /tmp/opsly-state.txt

# Subir a notebook (manual o script)
# NotebookLM genera Audio Overview → podcast de 5 min
```

### 2. Investigación de errors

```bash
# Query específica
node scripts/query-notebooklm.mjs "¿Qué incidentes hay pendientes en el VPS?"
```

### 3. Reporte mensual para tenant

```bash
# Generar podcast desde PDF de métricas
python apps/notebooklm-agent/src/workflows/report-to-podcast.py \
  --input docs/reports/monthly-2026-03.pdf \
  --tenant smiletripcare \
  --output /tmp/smiletripcare-march-podcast.mp3
```

---

## ⚠️ Limitaciones y advertencias

| Limitación          | Notas                                                   |
| ------------------- | ------------------------------------------------------- |
| **API no oficial**  | Google puede cambiar sin aviso → ADR-014 documenta esto |
| **Rate limits**     | Consultar docs de notebooklm-py para límites            |
| **Solo Business+**  | Feature flag `NOTEBOOKLM_ENABLED` controla acceso       |
| **Datos sensibles** | No subir secretos a NotebookLM — solo docs públicos     |

---

## 🔗 Enlaces relacionados

- [`docs/KNOWLEDGE-SYSTEM.md`](KNOWLEDGE-SYSTEM.md) — sistema unificado
- [`skills/user/opsly-notebooklm/SKILL.md`](../skills/user/opsly-notebooklm/SKILL.md)
- [`docs/adr/ADR-025-notebooklm-knowledge-layer.md`](adr/ADR-025-notebooklm-knowledge-layer.md)
- [notebooklm-py GitHub](https://github.com/teng-lin/notebooklm-py)
