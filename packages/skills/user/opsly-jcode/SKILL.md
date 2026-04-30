---
name: opsly-jcode
description: Invoca jcode en sandbox para generar o refactorizar código de forma autónoma y segura.
priority: high
triggers:
  - "genera código para"
  - "implementa la función"
  - "crea un componente"
  - "jcode"
---

# Opsly Jcode Skill

## Cuándo usar

Usa este skill cuando una tarea de coding se delega a `jcode` desde el orchestrator o cuando se quiere ejecutar generación de código no interactiva de forma aislada.

## Funcionalidad

- Encola trabajos `jcode_execution` en BullMQ (`openclaw`).
- Ejecuta `jcode run "<prompt>"` en sandbox (`scripts/run-in-sandbox.sh`) para reducir riesgo.
- Permite ajustar `model`, `provider`, `timeout` y red (`allowNetwork`) por job.

## Entrada esperada

- `prompt` (obligatorio): instrucción de coding.
- `tenant_slug` (obligatorio): aislamiento y trazabilidad.
- `model` (opcional): override de modelo (`JCODE_MODEL`).
- `provider` (opcional): override de proveedor (`JCODE_PROVIDER`).
- `timeout` (opcional): segundos de ejecución.
- `allowNetwork` (opcional): habilita red en sandbox si se requiere.

## Salida

- `stdout`/`stderr` de `jcode`.
- metadatos de ejecución (`timeout_seconds`, `allow_network`, `image`, timestamp).

## Configuración requerida

- `JCODE_API_KEY` (si el proveedor elegido usa API key directa).
- `JCODE_MODEL` (opcional).
- `JCODE_PROVIDER` (opcional; p. ej. `claude`, `openai`, `openrouter`, `copilot`).
- Binario `jcode` disponible en el entorno donde corre el worker/sandbox.
