# Opsly — Arquitecto senior (diagnóstico y priorización)

## Cuándo usar

- Revisión de arquitectura antes de features grandes o cambios de infra.
- Priorizar bloqueantes operativos vs. deuda técnica.
- Preparar ADRs cuando el impacto sea medio/alto.
- **Después** de `opsly-context`: leer `AGENTS.md` y `VISION.md`; este skill no sustituye esas fuentes.

## Fuentes de verdad (no contradecir)

| Documento | Rol |
|-----------|-----|
| `VISION.md` | Norte comercial y fases |
| `AGENTS.md` | Estado operativo, bloqueantes, sprint |
| `ROADMAP.md` | Ventana semanal |
| `docs/IMPLEMENTATION-IA-LAYER.md` | Capa IA en TS |
| `docs/adr/` | Decisiones ya tomadas |
| `docs/SECURITY_CHECKLIST.md` | Zero-Trust y rutas sensibles |

## Decisiones fijas (innegociables en Opsly)

- Compose por tenant (no K8s/Swarm); Traefik v3; Doppler; Supabase `platform` + schema por tenant.
- Tráfico IA vía OpenClaw → LLM Gateway (sin LLM directo fuera de ese flujo).
- Incluir `tenant_slug` y `request_id` en jobs/orquestación cuando aplique.

## Marco mental (quick test)

1. **¿Es necesario para la fase actual y tenants reales?** Si no → roadmap, no esta semana.
2. **¿Qué rompe producción o validación de mercado si no se hace?** Seguridad perimetral, email/onboarding, pérdida de datos → antes que “nice to have”.
3. **¿Hay datos para decidir?** Si no → medir (métricas, load test, costo proveedor) antes de ADR.

## Bloqueantes recurrentes (validar en `AGENTS.md` 🔄)

Operativos típicos documentados en el repo:

- **Edge:** Cloudflare Proxy ON en registros del dominio de plataforma (ocultar origen); coherente con `VISION` / mitigaciones de seguridad.
- **Email:** Resend — dominio remitente verificado; sin eso, invitaciones fallan para correos fuera de sandbox.
- **SSH:** Solo Tailscale para administración; `docs/SECURITY-MITIGATIONS-*.md` y scripts tipo `vps-secure.sh` cuando aplique.
- **GCP vars:** Fase BigQuery/Vertex según checklist en AGENTS si el producto lo exige.

No listar secretos ni tokens en el análisis; usar `scripts/check-tokens.sh` y Doppler.

## Arquitectura validada (mantener)

- **Docker Compose por tenant:** simplicidad operativa hasta escala que justifique otro paso; escalar VPS antes que complejidad (alineado a `VISION.md`).
- **Traefik v3 + ACME:** TLS por subdominio; provider Docker; no migrar a nginx sin ADR.
- **Supabase + RLS + schemas:** transaccionalidad y aislamiento; coste proveedor revisar con volumen de tenants.
- **Redis + BullMQ:** throughput y simplicidad; riesgo = disponibilidad/persistencia — planificar snapshots/backup/runbook (ver `docs/ORCHESTRATOR.md`, infra Redis en compose), no sustituir por Kafka en esta fase sin ADR.
- **Doppler `prd`:** fuente de secretos; GitHub Actions según runbooks existentes.

## Deuda técnica frecuente (priorizar con datos)

- Aprobaciones de costos admin en memoria de proceso → persistencia cuando el negocio lo exija (`docs/COST-DASHBOARD.md`).
- E2E invite en CI → credenciales y secrets de GitHub; no bloquear merge por humo local mal configurado.
- Observabilidad distribuida (OTEL): diferir hasta que la latencia/debug multi-servicio lo justifique.

## Matriz de riesgo (plantilla)

| Riesgo | Probabilidad | Impacto | Mitigación | Esfuerzo | Owner |
|--------|--------------|---------|------------|----------|-------|
| … | baja/media/alta | bajo/alto/crítico | acción concreta | h | |

## Roadmap 30 / 60 / 90 días (orientativo)

- **30 días:** Cerrar bloqueantes de AGENTS + ROADMAP semana activa; endurecer red/email; pruebas de flujo crítico.
- **60 días:** Automatización onboarding/stripe según `VISION`; persistencia de métricas/decisiones de costo si aplica.
- **90 días:** Escala horizontal solo si triggers de negocio/técnicos lo justifican (tenants, CPU, SLA); documentar en ADR antes de multi-VPS.

## ADRs candidatos (numerar al crear el archivo en `docs/adr/`)

- NotebookLM / herramientas experimentales: flag por plan, términos de servicio.
- Multi-VPS / failover: disparadores (tenants, carga, contrato enterprise).
- Estrategia vectorial: pgvector vs. servicio dedicado según volumen.
- Fine-tuning / modelos propios: solo con dataset y ROI claros.

## Checklist por sprint (arquitectura)

- [ ] `AGENTS.md` 🔄 actualizado al cierre de sesión.
- [ ] Cambios de contrato HTTP/OpenAPI reflejados en `docs/openapi-opsly-api.yaml` y CI `validate-openapi`.
- [ ] Rutas nuevas con patrón Zero-Trust (`tenantSlugMatchesSession` donde toque `[slug]`).
- [ ] Sin secretos en código ni en prompts pegados en issues.
- [ ] `npm run type-check` y tests del workspace tocado en verde.

## Salida esperada al usar este skill

1. Lista corta de **prioridades** (máx. 5) con referencia a archivos del repo.
2. **Riesgos** con mitigación y orden sugerido.
3. **ADRs** a crear o actualizar, si el cambio supera el umbral de “trivial”.

**Versión skill:** 1.0.0 · Revisar cuando cambie fase en `VISION.md` o cierre de sprint en `ROADMAP.md`.
