-- Extiende schema sandbox (0023) con columnas alineadas a métricas y datasets enriquecidos.
-- Idempotente: IF NOT EXISTS / DO blocks.

-- agent_classifiers: métricas y tipo de modelo
ALTER TABLE sandbox.agent_classifiers
  ADD COLUMN IF NOT EXISTS model_type VARCHAR(50) DEFAULT 'naive_bayes';

ALTER TABLE sandbox.agent_classifiers
  ADD COLUMN IF NOT EXISTS precision_score DOUBLE PRECISION;

ALTER TABLE sandbox.agent_classifiers
  ADD COLUMN IF NOT EXISTS recall_score DOUBLE PRECISION;

ALTER TABLE sandbox.agent_classifiers
  ADD COLUMN IF NOT EXISTS f1_score DOUBLE PRECISION;

ALTER TABLE sandbox.agent_classifiers
  ADD COLUMN IF NOT EXISTS num_samples INT;

-- model_path nullable si aún no hay artefacto
ALTER TABLE sandbox.agent_classifiers
  ALTER COLUMN model_path DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_sandbox_agent_classifiers_name
  ON sandbox.agent_classifiers (name);

-- agent_training_datasets: columnas adicionales (compat con filas legacy)
ALTER TABLE sandbox.agent_training_datasets
  ADD COLUMN IF NOT EXISTS task_description TEXT;

ALTER TABLE sandbox.agent_training_datasets
  ADD COLUMN IF NOT EXISTS task_category VARCHAR(100);

ALTER TABLE sandbox.agent_training_datasets
  ADD COLUMN IF NOT EXISTS data_source VARCHAR(100) DEFAULT 'synthetic';

UPDATE sandbox.agent_training_datasets
SET
  task_description = COALESCE(task_description, description),
  task_category = COALESCE(task_category, expected_label)
WHERE description IS NOT NULL
  AND (task_description IS NULL OR task_category IS NULL);

-- agent_metrics: predicción enriquecida + tenant sandbox
ALTER TABLE sandbox.agent_metrics
  ADD COLUMN IF NOT EXISTS predicted_category VARCHAR(100);

ALTER TABLE sandbox.agent_metrics
  ADD COLUMN IF NOT EXISTS predicted_confidence DOUBLE PRECISION;

ALTER TABLE sandbox.agent_metrics
  ADD COLUMN IF NOT EXISTS execution_time_ms INT;

ALTER TABLE sandbox.agent_metrics
  ADD COLUMN IF NOT EXISTS tenant_slug VARCHAR(255) DEFAULT 'intcloudsysops';

UPDATE sandbox.agent_metrics
SET
  predicted_category = COALESCE(predicted_category, predicted_label),
  predicted_confidence = COALESCE(predicted_confidence, confidence)
WHERE predicted_category IS NULL AND predicted_label IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_agent_metrics_agent_created
  ON sandbox.agent_metrics(agent_name, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_metrics_correct
  ON sandbox.agent_metrics(correct)
  WHERE correct IS NOT NULL;
