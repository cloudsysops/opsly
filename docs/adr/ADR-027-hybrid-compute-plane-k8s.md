# ADR-027: Hybrid Control Plane vs Compute Plane (K8s Future Strategy)

**Status:** Propuesto (Estrategia) / Diferido (Implementación)  
**Fecha:** 2026-04-18  
**Contexto:** Evolución de Opsly hacia Agentes Autónomos y Escalado Enterprise.  
**Decisión:** Mover selectivamente cargas de trabajo "bursty" o "high-risk" a Kubernetes, manteniendo el Control Plane en Docker Compose.

## Contexto

Opsly ha crecido exitosamente bajo la premisa de **"Simplicidad Operativa"** usando Docker Compose + Traefik en VPS. Esta arquitectura es ideal para el **Control Plane** (API, Portal, Admin, Gateway HTTP) porque es stateless, fácil de debuguear y tiene OPEX bajo (ver `VISION.md` y [ADR-007](ADR-007-runbooks-y-documentacion-operativa.md) para documentación y runbooks operativos).

Sin embargo, la evolución del producto hacia **Agentes Autónomos** ([Design Doc #1: OAR](../design/OAR.md)) y **Modos Avanzados** (Quantum/Hacker) introduce nuevos desafíos:

1. **Elasticidad:** Los workers de BullMQ (`Orchestrator` — ver [ADR-020](ADR-020-orchestrator-worker-separation.md)) sufren picos de demanda. Tener workers "idle" en VPS es desperdicio económico; escalarlos manualmente es lento y reactivo.
2. **Sandboxing (Seguridad):** Modos como "Hacker" o herramientas como `execute_terminal` requieren aislamiento real a nivel OS. Ejecutar comandos arbitrarios en el host VPS compartido es un riesgo de seguridad inaceptable para planes Enterprise.
3. **Scheduling:** "Quantum Mode" requiere orquestar múltiples recursos (LLMs, workers) en paralelo con prioridades complejas que el escalado simple de Compose no resuelve eficientemente.

## Decisión

Adoptar una arquitectura **Híbrida** que divide las responsabilidades operativas, evitando la complejidad de K8s en el flujo crítico principal hasta que sea necesario.

### 1. Control Plane (Permanece en Compose/VPS)

Mantiene la simplicidad y velocidad de desarrollo actual.

- **Componentes:** `apps/api`, `apps/portal`, `apps/admin`, `apps/mcp` (servidor HTTP), `apps/web`.
- **Infraestructura:** Docker Compose + Traefik (ver [ADR-011](ADR-011-event-driven-orchestrator.md) sobre orquestador event-driven y colas).
- **Motivación:** Son servicios HTTP stateless. El coste de migrarlos a K8s no justifica el beneficio, y su debug local es más accesible en el entorno actual.

### 2. Compute Plane (Migración futura a K8s)

Mueve las cargas intensivas a un clúster dedicado (o gestionado) cuando se cumplan los criterios de activación.

- **Componentes:**
  - **Orchestrator Workers:** Para autoscaling con **KEDA** basado en profundidad de cola de Redis.
  - **Sandboxes de Ejecución:** **K8s Jobs** efímeros para ejecución de código (`fs_write`, `execute_terminal`) con ServiceAccounts mínimas y aislamiento por tenant.
  - **ML Service:** Para manejo de GPUs y cargas pesadas de entrenamiento/embeddings.
  - **Ingestion Service:** Para absorber picos de webhooks sin impactar la latencia del API principal.
- **Infraestructura:** Kubernetes (K3s, GKE Autopilot o EKS) + KEDA + ArgoCD (GitOps).

### 3. Herramientas Asociadas al Compute Plane

Cuando se active la fase K8s, se incluirán en el stack:

- **KEDA:** Para autoscaling event-driven de los workers de BullMQ.
- **ArgoCD:** Para GitOps del compute plane (Single Source of Truth en Git).
- **Falco:** Para seguridad de runtime (detección de anomalías en pods de agentes/sandboxes).

## Consecuencias

- **Positivas:**
  - Mantiene el OPEX bajo del día a día del desarrollo (Control Plane simple en VPS).
  - Prepara el producto para contratos Enterprise reales (Sandboxing, Elasticidad garantizada).
  - Permite escalar infinitamente la capacidad de "pensamiento" (LLMs/Jobs) sin encarecer la infraestructura base de control.
- **Negativas:**
  - Aumenta la complejidad operativa en fases posteriores (dos entornos: VPS + K8s).
  - Requiere equipo capacitado en K8s para el mantenimiento del Compute Plane.
  - Introduce latencia de red potencial entre Control Plane (VPS) y Compute Plane (K8s) si no están en la misma VPC.

## Criterios de Activación (Fase 2 → 3)

No se procederá a la migración del Compute Plane hasta que se cumpla **al menos uno** de los siguientes criterios de negocio/tecnología:

1. **Coste:** El coste mensual de VPS "idle" (workers esperando trabajos) supere el coste operativo de gestionar un clúster K8s (o K3s dedicado).
2. **Seguridad:** Un cliente Enterprise exija contractualmente **Sandboxing de nivel OS** (gVisor/Firecracker) para ejecutar scripts de agente o código de terceros.
3. **Rendimiento:** La latencia de cola de BullMQ impacte negativamente los SLAs de servicio en >10% de los requests o el tiempo de procesamiento supere los umbrales aceptables.

## Alternativas Consideradas

1. **Full K8s (Big Bang):** Rechazado por violar la regla de simplicidad operativa actual y aumentar el OPEX prematuramente.
2. **VMs Efímeras (AWS Lambda / Fly Machines):** Considerada como alternativa a K8s Jobs para sandboxing, pero K8s ofrece mejor integración con nuestro stack de contenedores y orquestación (BullMQ/KEDA).
3. **Redis Gestionado:** En lugar de auto-hostear Redis en K8s, se mantendrá opción de usar servicio gestionado (ElastiCache/Memorystore) si reduce carga operativa.

## Referencias

- **Design Doc #1:** [Opsly Agentic Runtime (OAR)](../design/OAR.md) — Define la necesidad de ejecución compleja y sandboxing.
- **[ADR-020](ADR-020-orchestrator-worker-separation.md):** Separación Orchestrator/Worker — Base para escalar workers independientemente.
- **[ADR-011](ADR-011-event-driven-orchestrator.md):** Arquitectura Event-Driven — Justificación del uso de colas como backbone.
- **`VISION.md`:** Despliegue por defecto Compose+VPS; este ADR define la **excepción estratégica** futura (compute plane opcional en K8s), no un reemplazo del control plane por defecto.
