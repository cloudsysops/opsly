---
status: active
owner: platform
date: 2026-05-16
---

# LOCAL-FIRST RUNTIME ARCHITECTURE

## Executive Summary

Opsly evolves from **VPS-only** → **tenant-centric topology selection** (local-first, hybrid, cloud).

**Goal:** Reduce setup friction, cost, latency. Let tenant choose their infrastructure.

**Timeline:** Phases 1-3 over ~12 months. No redesign of core (`orchestrator`, `api`, `mcp`).

---

## PHASE 1: LOCAL-FIRST (Weeks 1-12, Q3-Q4 2026)

### What Tenant Sees

```bash
$ npm run runtime:setup
# ↓
# 🔍 Detecting environment...
#    CPU: 8 cores | RAM: 16GB | GPU: none | OS: macOS
#
# 📋 Recommendation:
#    Use Colima (Docker) + local BullMQ workers
#    Estimated setup time: 5 minutes
#
# ✨ Install Colima? (y/n)
```

### What Gets Built

#### 1. Environment Detector (`lib/runtime/environment-detector.ts`)

```typescript
export interface RuntimeProfile {
  os: 'macos' | 'linux' | 'windows';
  cpuCores: number;
  ramGb: number;
  gpuAvailable: boolean;
  gpuMemoryGb?: number;
  tools: {
    docker: boolean;
    colima: boolean;
    ollama: boolean;
    redis: boolean;
  };
  recommendation: {
    topologyType: 'local-only' | 'hybrid' | 'cloud-recommended';
    dockerEngine: 'colima' | 'docker-desktop' | 'podman';
    maxLocalWorkers: number;
    useLocalRedis: boolean;
    suggestedCloudRole: 'backup' | 'gpu-jobs' | 'none';
  };
}

export function detectEnvironment(): RuntimeProfile {
  // Analyze system, return recommendation
}
```

#### 2. Setup Wizard (`scripts/runtime-setup-wizard.sh`)

Interactive guide:
1. Detect environment (call above)
2. Show recommendation
3. Install missing tools (Colima, Ollama, Redis)
4. Validate setup: `npm run validate-local-runtime`
5. Start tmux + BullMQ workers

#### 3. Documentation: `LOCAL-RUNTIME-GUIDE.md`

Playbooks:
- Mac M1/M2 (16GB) → Colima + 2 workers
- Mac M1/M2 (8GB) → Colima + 1 worker + hybrid
- Ubuntu 22 server → Docker + 4 workers
- Windows 11 + WSL2 → Docker Desktop + 2 workers
- VPS DigitalOcean → Docker + 8 workers

#### 4. Mission Control Update

UI shows:
```
┌─ LOCAL NODES
│  MacBook Pro (main)
│    CPU: 60% | RAM: 12GB/16GB | Workers: 2 active
│    Status: healthy | Queue depth: 3
│
│  Ubuntu Server (backup)
│    CPU: 20% | RAM: 6GB/32GB | Workers: 4 active
│    Status: healthy | Queue depth: 0
│
└─ QUEUE STATUS
   openclaw: 5 jobs (2 active, 3 pending)
   local-agents: 0 jobs
   shield-scan: 1 job (running)
```

### Code Changes (Week-by-week)

**Week 1:** Environment detector (`lib/runtime/environment-detector.ts`)
- [ ] CPU/RAM detection
- [ ] Tool detection (docker, colima, redis, ollama)
- [ ] Recommendation logic

**Week 2:** Setup wizard (`scripts/runtime-setup-wizard.sh`)
- [ ] Interactive prompts (Bash)
- [ ] Tool installation (Colima, Redis)
- [ ] Validation: `npm run validate-local-runtime`

**Week 3:** Documentation
- [ ] Guide per machine type
- [ ] Troubleshooting section
- [ ] FAQ (storage, GPU, network)

**Week 4:** Mission Control
- [ ] React component: `<LocalNodesPanel />`
- [ ] WebSocket updates: worker health, queue depth
- [ ] Styling: match existing dashboard

### Success Criteria (Phase 1)

- [ ] Tenant on Mac 16GB: setup **< 10 min** (end-to-end)
- [ ] Tenant on Ubuntu: setup **< 5 min** (Docker already installed)
- [ ] BullMQ workers visible in Mission Control
- [ ] `npm run validate-local-runtime` passes
- [ ] No cloud costs for local-only topology
- [ ] Docs cover 4+ machine types

### What Stays Same

- ✅ `orchestrator` scheduling (BullMQ remains)
- ✅ `api` + `mcp` servers (control plane)
- ✅ GitHub integration
- ✅ Stripe webhooks
- ✅ Tenant isolation (still per-domain)

---

## PHASE 2: CLOUD-ASSISTED (Weeks 13-26, 2027)

### What Changes

```typescript
// GCP adapter (new)
export class GCPAdapter implements CloudAdapter {
  async routeJob(job: Job, context: JobContext): Promise<Worker> {
    const cpuUsage = await getLocalCPUUsage();
    
    if (cpuUsage > 80 || job.tags.includes('gpu')) {
      // Delegate to Cloud Run
      return this.launchCloudRunWorker(job);
    }
    
    // Use local
    return getBullMQLocalWorker();
  }
}
```

**Cost analyzer:**
```
Local vs GCP?
  Local: $0 (your Mac)
  Cloud Run (2 hours): $1.50
  
  Recommendation: Use local ✅
```

### New Files

- `lib/cloud/gcp-adapter.ts` (200 LOC)
- `lib/cloud/cost-analyzer.ts` (150 LOC)
- `infra/gcloud/cloud-run-worker.yaml` (50 LOC)
- AWS/Azure adapter stubs (25 LOC each)

### When Tenant Onboards

```bash
$ npm run runtime:setup
# ↓
# ⚙️ Cloud configuration (optional)
# GCP Project ID? (leave blank for local-only)
# > my-gcp-project
#
# ✨ Configured for HYBRID topology
#    Local for fast jobs
#    Cloud Run for GPU/heavy compute
```

### Success Criteria (Phase 2)

- [ ] Job routed to Cloud Run when local CPU > 80%
- [ ] Cost analyzer predicts cost vs local accurately
- [ ] Fallback: if Cloud Run fails → retry local
- [ ] Dashboard shows: "Using local (save $50/mo)"

---

## PHASE 3: MULTI-CLOUD (Weeks 27+, 2027+)

### Provider Abstraction

```typescript
export interface CloudProvider {
  name: 'gcp' | 'aws' | 'azure' | 'hetzner' | 'local';
  compute: {
    launch(job: Job): Promise<Worker>;
    terminate(workerId: string): Promise<void>;
    health(): Promise<ProviderHealth>;
  };
  storage: {
    upload(file: Buffer): Promise<string>;
    download(path: string): Promise<Buffer>;
  };
  estimatedCost(job: Job): Promise<number>;
}

export class ProviderRegistry {
  async selectBest(job: Job, constraints: Constraints): Promise<CloudProvider> {
    // Evaluate all available providers
    // Return best fit by: cost, latency, compliance
  }
}
```

### Tenant Selects Provider

```bash
$ npm run runtime:setup
# ↓
# 🌍 Multi-cloud setup
# 
# Available providers:
# 1. Local (your Mac)
# 2. GCP
# 3. AWS
# 4. Hetzner (EU) ← best for GDPR
#
# Which primary? (1-4)
# > 4
```

---

## ARCHITECTURE DIAGRAM (All Phases)

```
PHASE 1: LOCAL-FIRST
┌──────────────────────────────────┐
│  Tenant Machine                  │
│  ├─ tmux sessions                │
│  ├─ BullMQ workers (2-4)         │
│  └─ Redis local                  │
│          ↓ (via Redis)           │
│  Opsly Control Plane             │
│  ├─ API (apps/api)               │
│  ├─ Portal (React)               │
│  └─ Orchestrator (routing only)  │
└──────────────────────────────────┘

PHASE 2: HYBRID
┌──────────────────┐      ┌──────────────────┐
│ Tenant Machine   │      │ GCP Cloud Run    │
│ Local workers (2)│◄────►│ Heavy jobs       │
└──────────────────┘      └──────────────────┘
          ↓
   Opsly Control Plane
   (same as Phase 1)

PHASE 3: MULTI-CLOUD
┌──────────┐  ┌─────────┐  ┌────────┐  ┌──────────┐
│  Local   │  │  GCP    │  │  AWS   │  │ Hetzner  │
│ 2 workers│  │Cloud Run│  │ Lambda │  │ 4 VPS    │
└────┬─────┘  └────┬────┘  └───┬────┘  └────┬─────┘
     └──────────┬──────────────┬─────────────┘
                │ (all via BullMQ + Redis)
         ┌──────▼─────────┐
         │ Opsly Control  │
         │ Plane (multi-  │
         │ cloud aware)   │
         └────────────────┘
```

---

## MIGRATION PATH (No Redesign)

| Component | Phase 1 | Phase 2 | Phase 3 |
|-----------|---------|---------|---------|
| `orchestrator` (BullMQ) | ✅ Same | ✅ Same | ✅ Same |
| `api` (control plane) | ✅ Same | ✅ Same | ✅ Same |
| `mcp` (tools) | ✅ Same | ✅ Same | ✅ Same |
| Worker dispatch | Local only | Local + Cloud Run | Local + GCP + AWS + ... |
| Cost tracking | N/A | Estimate | Actual per provider |
| Tenant topology | Local only | Optional Cloud | Multi-choice |

**Key:** No core logic changes. Only **routing layer** evolves.

---

## RISKS & MITIGATIONS

| Risk | Mitigation |
|------|-----------|
| Mac storage full | Recommend external NAS or cloud backup |
| Internet downtime | Hybrid mode ensures backup to VPS/cloud |
| Developer switches laptop | Session resumption: `tmux attach` or recovery |
| Resource limits (8GB Mac) | Recommend upgrade or hybrid (delegate to cloud) |

---

## NOT DOING YET

- ❌ Kubernetes (too complex for Phase 1-2)
- ❌ Complex VPC networking (Tailscale sufficient)
- ❌ Distributed tracing (local logging sufficient)
- ❌ Cost showback to tenant (Phase 2+)
- ❌ AI auto-scaling (Phase 3+ after demand signal)

---

## OWNER CHECKLIST

**Architect:**
- [x] Design (this document)
- [x] Update VISION.md + AGENTS.md
- [ ] Review PRs (4 total)

**Developer (4 weeks):**
- [ ] Week 1: Environment detector
- [ ] Week 2: Setup wizard
- [ ] Week 3: Documentation
- [ ] Week 4: Mission Control UI

**QA (2 weeks):**
- [ ] Test setup on Mac M1/M2, Mac Intel, Ubuntu, Windows
- [ ] Validate BullMQ workers start
- [ ] Validate Mission Control displays correctly

**Deploy:**
- [ ] Merge to `main`
- [ ] Tag: `runtime-local-first-v1`
- [ ] Onboard internal team
- [ ] Onboard first customer (local-first test)

---

## METRICS (Month 1)

- Tenant setup time: **< 10 min**
- Environment detection accuracy: **100%** (3+ machine types)
- Local BullMQ availability: **99.9%** (sessions resume across reboots)
- Mission Control local nodes display: **< 2s latency**
- Customer satisfaction: **survey after 1st week**

---

## NEXT STEPS

1. **Architect:** ✅ Done (this doc)
2. **Lead Dev:** Read this doc, estimate effort per week
3. **CTO review:** Approve timeline + scope
4. **Dev start:** Week 1 = environment detector
5. **QA prep:** Prepare test matrix (4 OS combos)

