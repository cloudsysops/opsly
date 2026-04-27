# Kafka + Airflow Bootstrap (Opsly)

## Objetivo

Activar Kafka y Airflow de forma incremental, sin reemplazar BullMQ ni romper flujos actuales.

## Reglas de seguridad/costo

- Requiere aprobación explícita antes de activar costos recurrentes.
- No exponer UIs públicamente por defecto.
- Mantener despliegue principal en Compose actual; Kafka/Airflow son overlays opt-in.

## Arranque local/staging

```bash
docker compose -f infra/docker-compose.kafka.yml up -d
docker compose -f infra/docker-compose.airflow.yml up -d
```

## Integración runtime

- Cliente Kafka: `apps/llm-gateway/src/kafka-client.ts`
- Bridge Kafka↔BullMQ: `apps/orchestrator/src/bridges/kafka-bullmq-bridge.ts`
- DAG base: `apps/airflow/dags/opsly_evolution_dag.py`

## Validación

1. Kafka UI responde en `127.0.0.1:8080`.
2. Airflow web responde en `127.0.0.1:8081`.
3. `type-check` de orquestator y llm-gateway en verde.
4. Ningún servicio de producción principal degradado.
