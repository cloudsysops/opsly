# Local-First Architecture

> Arquitectura que prioriza ejecución local antes de fallback a servicios cloud.
> Fase: Planning | Owner: Claude | Last Updated: 2026-05-16

## 🎯 Visión

**Problema:** Opsly actualmente depende 100% de servicios cloud (VPS, LLM cloud providers) para ejecutar agentes. Esto genera:
- Latencia alta en respuestas de agentes
- Costos recurrentes por tokens LLM cloud
- Fragilidad si VPS o internet caen

**Solución:** Arquitectura "Local-First" donde:
1. **Agentes locales** (Cursor, Claude, Codex, OpenCode) ejecutan primero
2. **Ollama/LLM local** como fallback gratuito
3. **Worker remoto** (VPS/Mac2011) solo para jobs que requieren cloud
4. **Estado persistido** en Redis local + sync a Supabase cuando hay conectividad

## 📊 Weeks Breakdown

### Week 1: Environment Detection (Core)
- [ ] `lib/runtime/environment-detector.ts` — detecta capabilities locales
- [ ] Sistema de detection por OS (macOS/Linux/Windows/WASM)
- [ ] Health checks para recursos locales (CPU, RAM, Disk)

### Week 2: Runtime Setup Wizard
- [ ] `scripts/runtime-setup-wizard.sh` — setup automatizado
- [ ] Detección de herramientas disponibles (node, python, docker)
- [ ] Configuración de paths y entorno

### Week 3: Local Execution Pipeline
- [ ] `lib/runtime/local-executor.ts` — ejecuta prompts en agentes locales
- [ ] Soporte para Cursor, Claude, Codex, OpenCode
- [ ] Timeout y retry logic

### Week 4: LLM Local Fallback
- [ ] `lib/runtime/llm-local-fallback.ts` — Ollama como fallback
- [ ] Model selection por complexity (small → medium → large)
- [ ] Budget tracking local

### Week 5-6: Integration + Testing
- [ ] Integración con orchestrator existente
- [ ] E2E tests del pipeline completo
- [ ] Documentación para el equipo

---

## 🏗️ Pivote Arquitectónico

### Antes (Actual)
```
User Request → Orchestrator → BullMQ → Worker VPS → LLM Cloud
                                                    ↓
                                              (alto costo, latencia)
```

### Después (Local-First)
```
User Request → Orchestrator → Environment Detector
                            ↓
              ┌─────────────┴─────────────┐
              ↓                           ↓
        Local Agents               LLM Local (Ollama)
        (Cursor/Claude)             (gratis, rápido)
              ↓                           ↓
              └─────────────┬─────────────┘
                            ↓
                    Worker VPS/SaaS
                    (solo si es necesario)
```

---

## 📁 Componentes

### Core
- `lib/runtime/environment-detector.ts` — detecta capacidades del entorno
- `lib/runtime/local-executor.ts` — ejecuta en agentes locales
- `lib/runtime/llm-local-fallback.ts` — fallback a Ollama
- `lib/runtime/worker-selector.ts` — decide dónde ejecutar

### Scripts
- `scripts/runtime-setup-wizard.sh` — setup automatizado
- `scripts/runtime-health-check.sh` — verificación de salud

### Config
- `config/local-first.json` — settings por defecto

---

## 🔧 Usage

```typescript
import { detectEnvironment } from './lib/runtime/environment-detector';

const env = await detectEnvironment();
// {
//   os: 'macos',
//   hasCursor: true,
//   hasClaude: true,
//   hasOllama: true,
//   cpuCores: 8,
//   memory: 16,
//   recommendedAgent: 'cursor'
// }

const result = await executeLocalAgent({
  prompt: 'Analiza este código',
  agent: 'auto', // auto-selecciona mejor agente
  budget: 'low'  // prefers local first
});
```

---

## ✅ Definition of Done

- [ ] 90% de requests ejecutan localmente (sin VPS)
- [ ] Latencia promedio < 2s para queries simples
- [ ] Costo LLM cloud reducido en 70%
- [ ] Tests passing en CI
- [ ] Docs actualizadas

---

## 🔗 References

- ADR-024: Ollama Local Worker
- ADR-027: Hybrid Compute Plane
- docs/IMPLEMENTATION-IA-LAYER.md