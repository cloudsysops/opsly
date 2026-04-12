# Task classifier (sandbox)

Entrenamiento local con Python (`scikit-learn`). No sustituye el clasificador LLM en `src/classifier.ts` (leads); es un experimento **sandbox** para categorías de tareas Opsly.

## Setup

```bash
cd apps/ml/agents/classifier
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python3 train.py
```

Genera `models/model.pkl` y `models/metrics.json` (el `.pkl` está en `.gitignore`).

## Inferencia

Desde TypeScript: `classifyTaskCategory` en `src/task-category-classifier.ts` ejecuta `infer.py`.

## Base de datos

Schema `sandbox` y tablas: migración `supabase/migrations/0023_sandbox_agent_training.sql`. Aplicar con `npx supabase db push` (no ejecutar SQL a mano en prod sin revisión).
