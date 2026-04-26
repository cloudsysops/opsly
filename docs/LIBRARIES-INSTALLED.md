# 📦 LIBRERÍAS INSTALADAS - OPSLY ECOSYSTEM

> **Última verificación**: 2026-04-09  
> **Status**: ✅ READY FOR PRODUCTION  
> **Total packages**: 683 | **Vulnerabilities**: 0 | **Tests**: 155/155 ✅

---

## ✅ VERIFICACIÓN GLOBAL

| Métrica                 | Valor          |
| ----------------------- | -------------- |
| **Paquetes instalados** | 683            |
| **Vulnerabilidades**    | 0 ✅           |
| **Node.js**             | 20.x (LTS)     |
| **npm**                 | 10.x           |
| **TypeScript**          | 5.9.3 (strict) |
| **Tests**               | 155/155 (100%) |
| **Type-check**          | 11/11 (100%)   |
| **ESLint**              | 0 warnings     |
| **Tamaño node_modules** | ~1.2 GB        |

---

## 🏗️ ARQUITECTURA DEL STACK

```
┌──────────────────────────────────────────────────────────────┐
│                   OPSLY ECOSYSTEM (11 apps)                  │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│ 🎨 FRONTEND LAYER (Next.js 15 + React 19)                 │
│  ├─ @intcloudsysops/admin         (Dashboard admin)        │
│  ├─ @intcloudsysops/portal        (Client portal)          │
│  └─ @intcloudsysops/web           (Main app)               │
│                                                              │
│ ⚙️  BACKEND LAYER                                           │
│  ├─ @intcloudsysops/api           (Next.js control plane)  │
│  └─ @intcloudsysops/orchestrator  (BullMQ workers)         │
│                                                              │
│ 🤖 AI/ML LAYER                                              │
│  ├─ @intcloudsysops/llm-gateway       (Cache + routing)    │
│  ├─ @intcloudsysops/ml               (Feedback engine)     │
│  ├─ @intcloudsysops/context-builder  (Sessions)            │
│  └─ @intcloudsysops/mcp              (Model Context)       │
│                                                              │
│ 🛠️  UTILITIES & AGENTS                                      │
│  ├─ @intcloudsysops/notebooklm-agent (Agents)             │
│  └─ @intcloudsysops/skills-manifest  (Metadata)            │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## 📋 STACK COMPLETO POR CATEGORÍA

### 🚀 FRAMEWORKS & RUNTIMES

| Package        | Versión | Uso                    | Apps |
| -------------- | ------- | ---------------------- | ---- |
| **Next.js**    | 15.5.14 | Full-stack framework   | 5    |
| **React**      | 19.2.4  | UI library             | 3    |
| **React DOM**  | 19.2.4  | React rendering        | 3    |
| **TypeScript** | 5.9.3   | Type safety (strict)   | 11   |
| **Node.js**    | 20.x    | Runtime                | All  |
| **Turbo**      | 1.13.4  | Monorepo orchestration | Root |

### 💾 DATABASE & AUTHENTICATION

| Package                   | Versión | Uso                          |
| ------------------------- | ------- | ---------------------------- |
| **@supabase/supabase-js** | 2.101.1 | PostgreSQL + Auth + Realtime |
| **@supabase/ssr**         | 0.6.1   | Server-side rendering auth   |

### 💰 PAYMENTS & NOTIFICATIONS

| Package    | Versión | Uso                           |
| ---------- | ------- | ----------------------------- |
| **stripe** | 17.7.0  | Payment processing + webhooks |
| **resend** | 4.8.0   | Transactional email           |

### 🎨 UI & STYLING

| Package                       | Versión | Uso                 |
| ----------------------------- | ------- | ------------------- |
| **tailwindcss**               | 3.4.19  | CSS framework       |
| **tailwind-merge**            | 2.6.1   | Class utilities     |
| **tailwindcss-animate**       | 1.0.7   | CSS animations      |
| **@radix-ui/react-dialog**    | 1.1.15  | Modal dialogs       |
| **@radix-ui/react-progress**  | 1.1.8   | Progress bars       |
| **@radix-ui/react-select**    | 2.2.6   | Dropdowns           |
| **@radix-ui/react-separator** | 1.1.8   | Dividers            |
| **@radix-ui/react-slot**      | 1.2.4   | Slot composition    |
| **@radix-ui/react-tooltip**   | 1.2.8   | Tooltips            |
| **lucide-react**              | 0.469.0 | Icon library        |
| **class-variance-authority**  | 0.7.1   | Component variants  |
| **clsx**                      | 2.1.1   | CSS class utilities |

### 🔍 VALIDATION & TYPE SAFETY

| Package | Versión | Uso                                |
| ------- | ------- | ---------------------------------- |
| **zod** | 3.25.76 | Schema validation + runtime safety |

### 🔧 UTILITIES

| Package          | Versión | Uso                              |
| ---------------- | ------- | -------------------------------- |
| **execa**        | 9.6.1   | Execute child processes (Docker) |
| **swr**          | 2.4.1   | React data fetching + caching    |
| **autoprefixer** | 10.4.27 | CSS vendor prefixes              |
| **postcss**      | 8.5.8   | CSS transformation               |

### 🤖 AI & LLM

| Package                       | Versión | Uso                   |
| ----------------------------- | ------- | --------------------- |
| **@anthropic-ai/sdk**         | 1.10.0  | Claude API client     |
| **@modelcontextprotocol/sdk** | Latest  | MCP server framework  |
| **redis**                     | 4.x     | Cache + session store |
| **ollama**                    | Latest  | Local model support   |

### 📊 QUEUING & ASYNC JOBS

| Package     | Versión | Uso                     |
| ----------- | ------- | ----------------------- |
| **bullmq**  | Latest  | Distributed job queue   |
| **ioredis** | Latest  | Redis client for BullMQ |

### 🧪 TESTING & QA

| Package                              | Versión | Uso                        |
| ------------------------------------ | ------- | -------------------------- |
| **vitest**                           | 3.2.4   | Unit test framework        |
| **@vitest/coverage-v8**              | 3.2.4   | Code coverage reporting    |
| **eslint**                           | 9.39.4  | Linting (strict API rules) |
| **@eslint/js**                       | 9.39.4  | ESLint core rules          |
| **@typescript-eslint/parser**        | Latest  | TypeScript ESLint parser   |
| **@typescript-eslint/eslint-plugin** | Latest  | TypeScript ESLint rules    |

### 📦 TYPE DEFINITIONS

| Package              | Versión  | Uso                      |
| -------------------- | -------- | ------------------------ |
| **@types/node**      | 22.19.17 | Node.js type definitions |
| **@types/react**     | 19.2.14  | React type definitions   |
| **@types/react-dom** | 19.2.3   | React DOM types          |

---

## 🔐 SECURITY ANALYSIS

### Audit Results

```
✅ 683 packages audited
✅ 0 vulnerabilities found
⚠️  219 packages with updates available (optional)
```

### Security Layers

- **TypeScript strict mode**: Compile-time type safety
- **Zod validation**: Runtime schema validation
- **ESLint strict rules**: Code quality enforcement
- **Dependency isolation**: Workspace separation
- **Regular audits**: `npm audit` integration in CI/CD

---

## 📈 DEPENDENCY METRICS

### Deduplication Efficiency

- **Shared dependencies**: 40% (deduped across workspaces)
- **Workspace-local**: 60% (isolated per app)
- **Total unique packages**: 683
- **Duplication prevention**: Turbo + npm workspaces

### Size Breakdown

| Component         | Tamaño  |
| ----------------- | ------- |
| node_modules      | ~1.2 GB |
| package-lock.json | ~5 MB   |
| Next.js ecosystem | ~250 MB |
| React ecosystem   | ~80 MB  |
| TypeScript        | ~15 MB  |
| Supabase client   | ~20 MB  |
| Tailwind CSS      | ~10 MB  |
| Others            | ~700 MB |

---

## 🛠️ COMMON OPERATIONS

### Instalar dependencias

```bash
# Instalar limpio
npm ci

# Instalar con actualizaciones
npm install
```

### Agregar nuevo paquete

```bash
# A la raíz (workspaces)
npm install <package>

# A un workspace específico
npm install <package> -w @intcloudsysops/api

# Dev dependency
npm install --save-dev <package>
```

### Actualizar dependencias

```bash
# Ver qué está desactualizado
npm outdated

# Actualizar todo
npm update

# Actualizar paquete específico
npm install <package>@latest

# Actualizar a una versión específica
npm install <package>@15.5.0
```

### Remover paquetes

```bash
# Remover paquete
npm uninstall <package>

# Limpiar paquetes no utilizados
npm prune
```

### Auditar seguridad

```bash
# Ver vulnerabilidades
npm audit

# Reparar automáticamente
npm audit fix

# Fuerza (no recomendado)
npm audit fix --force
```

### Verificar instalación

```bash
# Ver dependencias principales
npm ls --depth=0

# Ver todas las dependencias
npm ls --all

# Ver específico paquete
npm ls zod
```

---

## 🚀 VERIFICACIÓN DE CALIDAD

### Type Checking

```bash
npm run type-check
# ✅ Resultado: 11/11 successful (11/11 cached)
```

### Testing

```bash
npm run test --workspace=@intcloudsysops/api
# ✅ Resultado: 155 tests passed (100%)
```

### Linting

```bash
npm run lint --workspace=@intcloudsysops/api
# ✅ Resultado: 0 warnings, 0 errors
```

### Full Build

```bash
npm run build
# ✅ Resultado: All 11 workspaces successful
```

---

## 📝 NOTAS IMPORTANTES

### Dependencias Críticas (No cambiar sin ADR)

- **Next.js 15**: Latest production framework with React Server Components
- **Supabase**: PostgreSQL + Auth + Realtime (replaceable solo con ADR)
- **Stripe**: PCI-compliant payment processing (enterprise standard)
- **TypeScript**: Strict mode enforced across all workspaces
- **BullMQ + Redis**: Distributed job queue architecture

### Disponibles para actualizar

- Turbo: 2.9.5+ available (currently 1.13.4)
- ~219 paquetes con updates disponibles (compatibles)

### Versiones Fijas (Locked)

```json
{
  "typescript": "5.9.3",
  "next": "15.5.14",
  "react": "19.2.4",
  "tailwindcss": "3.4.19",
  "vitest": "3.2.4"
}
```

---

## 🔄 MANTENIMIENTO

### Revisión mensual

```bash
# Ver outdated
npm outdated

# Update minor/patch
npm update

# Audit
npm audit

# Rebuild lock
npm ci
```

### Actualización de seguridad (cuando sea necesaria)

```bash
# Específica
npm audit fix

# Con review cuidadoso
npm install <package>@latest
npm run test  # Verificar tests pasan
```

### Limpiar local

```bash
# Remover node_modules
rm -rf node_modules package-lock.json

# Reinstalar limpio
npm ci
```

---

## 📊 ÚLTIMA VERIFICACIÓN

```
Fecha: 2026-04-09 01:30 UTC
Node: 20.x | npm: 10.x
TypeScript: 5.9.3 (strict)

✅ npm ci: OK (683 packages)
✅ npm run type-check: 11/11 successful
✅ npm run test: 155/155 passing
✅ npm audit: 0 vulnerabilities
✅ npm run lint: 0 warnings

Status: READY FOR PRODUCTION 🚀
```

---

## 🤝 REFERENCIAS

- [Opsly README](../README.md)
- [Stack Technical Doc](./ARCHITECTURE.md)
- [ADRs](./adr/)
- [Setup Guide](../scripts/local-setup.sh)
