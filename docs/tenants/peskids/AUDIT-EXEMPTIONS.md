---
status: draft
owner: operations
last_review: 2026-05-24
type: tenant
tags:
  - opsly/tenant
---

# npm audit exemptions for Peskids MVP
# These vulnerabilities are pre-existing in the MVP phase
# and were documented + approved in PR #372

# Peskids MVP inherits Next.js 14 which has transitive vulnerabilities
# Phase 2 will upgrade to Next.js 15+ and resolve these

# Approved vulnerabilities (MVP phase):
# - protobufjs (CRITICAL): from @xenova/transformers chain
# - langsmith (HIGH): from langchain dependencies  
# - tar (HIGH): from node-gyp/cacache chain
# - postcss (MODERATE): from Next.js 14
# - esbuild (MODERATE): from vite/vitest in task-orchestrator
# - brace-expansion (MODERATE): from eslint dependencies

# Risk acceptance: Low-exposure MVP infrastructure
# Timeline: Phase 2 will include Next.js 14→15 upgrade + dependency refresh

# See: PR #372, .npmrc, docs/tenants/peskids/MVP-PLAN.md

---

## Enlaces relacionados

- [[tenants/peskids/README|peskids]]
- [[brain/README|Brain Central]]
