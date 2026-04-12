-- Sandbox ML: tablas aisladas en schema `sandbox` (no toca tenant_* ni platform.tenants).
-- Uso: clasificador de tareas Opsly; solo service_role desde backend.
CREATE SCHEMA IF NOT EXISTS sandbox;
GRANT USAGE ON SCHEMA sandbox TO service_role;
CREATE TABLE IF NOT EXISTS sandbox.agent_classifiers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  model_path VARCHAR(500) NOT NULL,
  accuracy DOUBLE PRECISION,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS sandbox.agent_training_datasets (
  id SERIAL PRIMARY KEY,
  agent_name VARCHAR(255),
  task_category VARCHAR(100),
  description TEXT,
  expected_label VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS sandbox.agent_metrics (
  id SERIAL PRIMARY KEY,
  agent_name VARCHAR(255),
  task_input TEXT,
  predicted_label VARCHAR(100),
  confidence DOUBLE PRECISION,
  actual_label VARCHAR(100),
  correct BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
GRANT SELECT,
  INSERT,
  UPDATE,
  DELETE ON ALL TABLES IN SCHEMA sandbox TO service_role;
GRANT USAGE,
  SELECT ON ALL SEQUENCES IN SCHEMA sandbox TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA sandbox
GRANT SELECT,
  INSERT,
  UPDATE,
  DELETE ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA sandbox
GRANT USAGE,
  SELECT ON SEQUENCES TO service_role;