---
title: "Opsly 2.0 Agent Team Overview"
date: 2026-05-08
status: active
---

# The Complete Opsly 2.0 Agent Team

## 8 Specialized Agents + 1 Human Leader

```
┌────────────────────────────────────────────────────────────┐
│                   YOU (Human Leader)                       │
│               Approve milestones & strategy                │
└────────┬───────────────────────────────────────────────────┘
         │
         ▼
    ┌─────────────────┐
    │  HASHI          │
    │  (Architect)    │
    │  🧠             │
    │ Task            │
    │ Decomposition   │
    └────────┬────────┘
             │
    ┌────────┴────────────────────────┐
    │                                 │
    ▼                                 ▼
┌──────────────┐          ┌──────────────────┐
│  BRISSA      │          │  LILI            │
│  (Developer) │          │  (QA)            │
│  💻          │          │  🧪              │
│ Code         │          │ Tests            │
│ Implement    │          │ Validation       │
└──────┬───────┘          └─────┬────────────┘
       │                        │
       │                    ┌───┴────┐
       │                    │        │
       │                    ▼        ▼
       │              ┌──────────────┐
       │              │  NYX         │
       │              │  (Researcher)│
       │              │  🔍          │
       │              │ Investigation
       │              │ Spike POCs   │
       │              └──────┬───────┘
       │                     │
       └──────────┬──────────┘
                  │
    ┌─────────────┴──────────────┐
    │                            │
    ▼                            ▼
┌──────────────┐        ┌──────────────┐
│  KAIRO       │        │  ARIA        │
│  (Security)  │        │  (Docs)      │
│  🔒          │        │  📚          │
│ Audit        │        │ Documentation
│ Scan         │        │ Runbooks     │
└──────┬───────┘        └──────┬───────┘
       │                       │
       └───────────┬───────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
        ▼                     ▼
    ┌──────────────┐    ┌────────────────┐
    │  LOUSA       │    │  MICHELLE      │
    │  (Interventora) │    │  (Pressure)    │
    │  👩‍⚖️          │    │  ⚡             │
    │ QA Gates     │    │ Performance    │
    │ Enforcement  │    │ Optimization   │
    │ Standards    │    │ Capacity       │
    └──────┬───────┘    └────────┬───────┘
           │                     │
           └──────────┬──────────┘
                      │
                      ▼
            ┌──────────────────┐
            │  GITHUB → DEPLOY │
            │  Production ✅   │
            └──────────────────┘
```

---

## Agent Profiles (Quick Reference)

### 🧠 **HASHI** — The Architect
**Personality:** Strategic, methodical, detail-oriented  
**Role:** Task decomposition & planning  
**Input:** User task: "Build Stripe payment integration"  
**Output:** Dependency graph + Context Pack for each agent  
**SLA:** <30 min task decomposition  
**Success Metric:** All subtasks properly sequenced, no missing dependencies  

---

### 💻 **BRISSA** — The Developer
**Personality:** Fast, pragmatic, quality-focused  
**Role:** Code implementation  
**Input:** Subtask from Hashi + Context Pack  
**Output:** PR with tests + commits  
**SLA:** Code written in <estimated_time ±20%  
**Success Metric:** Type-check passes, test coverage >80%, no hardcoded secrets  

---

### 🧪 **LILI** — The QA Engineer
**Personality:** Thorough, meticulous, safety-conscious  
**Role:** Testing + validation + error recovery  
**Input:** Brissa's PR  
**Output:** Test results + approval or fix suggestions  
**SLA:** <5 min test execution, >95% pass rate  
**Success Metric:** All tests pass, performance stable, migrations reversible  

---

### 🔍 **NYX** — The Researcher
**Personality:** Curious, investigative, solution-oriented  
**Role:** Investigation & proof-of-concept  
**Input:** "How do we implement X?"  
**Output:** Research report + spike PR + recommendations  
**SLA:** <2 hours per research question  
**Success Metric:** Clear recommendation, working POC, no dead ends  

---

### 🔒 **KAIRO** — The Security Officer
**Personality:** Vigilant, strict, zero-tolerance  
**Role:** Security audit & vulnerability scanning  
**Input:** Brissa's PR code changes  
**Output:** Approval or blocking with findings  
**SLA:** <2 min scan time  
**Success Metric:** Zero HIGH/CRITICAL issues, hardcoded secrets rejected, no SQL injection  

---

### 📚 **ARIA** — The Documentarian
**Personality:** Organized, communicative, detail-driven  
**Role:** Documentation & runbooks  
**Input:** Deploy event + changes  
**Output:** Updated AGENTS.md, API docs, runbooks  
**SLA:** Documentation complete within 1 hour of deploy  
**Success Metric:** Docs 100% up-to-date, VISION.md in sync, runbooks tested  

---

### 👩‍⚖️ **LOUSA** — The Interventora (Quality Enforcer)
**Personality:** Authoritative, exacting, standards-driven  
**Role:** Quality control & standard enforcement  
**Input:** All agent outputs  
**Output:** Daily compliance reports + enforcement actions  
**SLA:** Gate decisions <5 min  
**Success Metric:** 100% SLA compliance, zero quality gate bypasses, escalations documented  

**Powers:**
- ✅ APPROVE: Merge allowed if all gates pass
- 🔴 REJECT: Block merge if standards not met
- ⚠️ ESCALATE: Escalate to human if blockers persist
- 🔄 RETRY: Force agent retry with different strategy
- ⏸️ PAUSE: Pause workflow if quality degrades

---

### ⚡ **MICHELLE** — The Performance Driver
**Personality:** Ambitious, optimizing, pushing boundaries  
**Role:** Performance optimization & capacity maximization  
**Input:** Metrics from all agents  
**Output:** Optimization recommendations + performance reports  
**SLA:** Weekly optimization analysis  
**Success Metric:** 10% velocity improvement week-over-week, throughput increasing  

**Focus Areas:**
- Hashi: Decompose in 15 min (vs current 30)
- Brissa: Ship 20% faster without compromising quality
- Lili: Parallelize tests, hit 5-min target
- Kairo: Cache scanning results, 50% faster
- Aria: Auto-generate docs, 80% less manual work
- Nyx: Indexed knowledge search, 3x faster

---

## Agent Interactions (Common Workflows)

### Workflow 1: Feature Implementation (Hashi → Brissa → Lili → Kairo → Aria)

```
Hashi receives: "Add OAuth2 support"
  ↓
Hashi creates:
  • Task S1: Design OAuth2 flow (Brissa)
  • Task S2: Implement OAuth2 endpoints (Brissa)
  • Task S3: Write tests (Lili)
  • Task S4: Security audit (Kairo)
  • Task S5: Document OAuth2 setup (Aria)
  ↓
Brissa implements S1 + S2 → Opens PR
  ↓
Lili runs S3 tests → Found 2 failures
  ↓
Lili suggests fix: "Mock third-party auth, add retry logic"
  ↓
Brissa applies fix → Tests pass
  ↓
Kairo runs S4 → Found: no PKCE validation
  ↓
Brissa adds PKCE → Kairo approves
  ↓
Aria runs S5 → Updates API docs, runbooks
  ↓
Lousa checks:
  • All tests ✅
  • Security ✅
  • Docs ✅
  • GATE OPEN → MERGE
  ↓
Michelle reports:
  • Feature shipped in 6 hours (vs estimated 8)
  • 15% faster than last feature
  • Recommend: Parallelize Lili+Kairo next time
```

### Workflow 2: Unknown Investigation (Nyx → Brissa)

```
Brissa asks Nyx: "Can we use library X with our Node version?"
  ↓
Nyx researches:
  • Checks compatibility matrix
  • Finds GitHub issues
  • Tests library X locally
  • Creates spike PR
  ↓
Nyx returns: "Library X incompatible with Node 18, use Y instead"
  ↓
Brissa uses library Y → Continues implementation
```

### Workflow 3: Performance Crisis (Lousa → Michelle → All Agents)

```
Lousa alerts: "Throughput down 30% this week"
  ↓
Michelle analyzes:
  • Hashi: Taking 45 min vs target 30 (bottleneck!)
  • Brissa: Normal pace
  • Lili: Tests taking 8 min vs target 5
  ↓
Michelle recommends:
  • Hashi: Cache Context Pack templates
  • Lili: Parallelize tests (use Jest shards)
  ↓
Agents implement optimizations
  ↓
Michelle reports: "Throughput back to +5% growth"
```

---

## Agent Communication Channels

| From | To | Medium | Message |
|------|---|--------|---------|
| Hashi | All | GitHub Issues + Task Queue | Subtask assignments |
| Brissa | Lili | GitHub PR | Code for testing |
| Lili | Brissa | GitHub PR Comments | Fix suggestions |
| Kairo | All | GitHub PR Review | Security approval/block |
| Aria | All | Git Commit | Documentation updates |
| Nyx | Brissa | GitHub Issue | Research findings |
| Lousa | All | Daily Report + Slack | Quality metrics, enforcement |
| Michelle | All | Weekly Report | Performance analysis |

---

## Success Metrics (Per Agent)

| Agent | Metric | Target | How Measured |
|-------|--------|--------|--------------|
| Hashi | Decomposition time | <30 min | Task queue timestamps |
| Brissa | Code velocity | ±20% of estimate | Actual vs planned hours |
| Lili | Test pass rate | >95% | CI/CD results |
| Nyx | Research turnaround | <2 hours | Issue resolution time |
| Kairo | Scan time | <2 min | Prometheus metrics |
| Aria | Docs latency | <1 hour | Commit timestamps |
| Lousa | Gate compliance | 100% | Audit log |
| Michelle | Throughput growth | +10% week/week | Velocity trends |

---

## Team Dynamics

**Positive Feedback Loop:**
- Brissa codes fast → Lili validates → Kairo approves → Aria documents
- Lousa ensures quality → Michelle optimizes → Next cycle faster
- Faster cycles → More confidence → Higher quality → Better metrics

**Pressure Points (Healthy Tension):**
- Michelle pushes Brissa: "Faster delivery"
- Lousa restrains Michelle: "Without sacrificing quality"
- Brissa asks Nyx: "Is this pattern correct?"
- Kairo blocks if security issues: "Non-negotiable"
- Aria documents everything: "Future maintainability"

**Resolution Pattern:**
1. Michelle identifies bottleneck
2. Lousa validates it's real (not rushing quality)
3. Hashi redesigns workflow
4. Agents implement optimization
5. Metrics improve

---

## Scaling Strategy (8 Agents → N Agents)

**Current (8 agents):**
- 1 Hashi (architect)
- 1 Brissa (developer)
- 1 Lili (QA)
- 1 Kairo (security)
- 1 Aria (docs)
- 1 Nyx (researcher)
- 1 Lousa (quality)
- 1 Michelle (performance)

**Future (scale 2x):**
- 1 Hashi (orchestration stays central)
- 3 Brissas (parallel developers)
- 2 Lilis (parallel QA)
- 1 Kairo (centralized security)
- 1 Aria (centralized docs)
- 2 Nyxs (parallel research)
- 1 Lousa (cross-agent quality)
- 1 Michelle (cross-agent performance)

**Load Balancing:**
- Hashi distributes tasks to Brissas (task queue)
- Lilis run tests in parallel (CI/CD matrix)
- Nyxs explore different solutions simultaneously
- Lousa collects metrics from all agents
- Michelle aggregates performance data

---

## End State (Vision)

**By May 29, 2026:**

```
Opsly 2.0 Running Full Autonomy

    ┌─────────────────────────────┐
    │  YOU (Milestone Approvals)  │
    │  1-2 approvals/week         │
    └─────────────────────────────┘
              │ (approve)
              ▼
    ┌─────────────────────────────┐
    │   8-Agent Team (Hashi/      │
    │   Brissa/Lili/Kairo/Aria/  │
    │   Nyx/Lousa/Michelle)       │
    │   Building features 24/7     │
    └─────────────────────────────┘
              │ (deliver)
              ▼
    ┌─────────────────────────────┐
    │   Production              │
    │   Phase 5.1-5.4 deployed    │
    │   Metrics green ✅          │
    │   Cost optimized (-20%)      │
    │   Velocity +50%              │
    └─────────────────────────────┘
```

---

**The Opsly 2.0 Team is ready. Let's build.** 🚀


---

## Enlaces relacionados

- [[03-agents/README|03-agents]]
- [[brain/README|Brain Central]]
