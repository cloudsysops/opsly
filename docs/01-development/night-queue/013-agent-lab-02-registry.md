---
id: agent-lab-02-registry-013
status: held
owner: opsly-night-agent
created: 2026-09-11
requires_pr: true
agent_hint: cursor
reviewer_hint: codex
phase: 2
depends_on: agent-lab-01-inventory-012
canon: docs/design/OPSLY-AGENT-LAB.md
---

# Agent Lab 02 — Single job registry + agent registry (held)

**Held** until `012-agent-lab-01-inventory.md` is `status: done`. Then set this file to `pending`.

## Mission slice

Implement or extend **one** durable job registry and agent registry fields (capabilities, trust_level defaults = OBSERVE), wired to BullMQ/OpenClaw — no new orchestrator.

Job contract minimum: job_id, objective, source_signal, priority, risk, required_capabilities, candidate_agent, model, inputs, acceptance_criteria, tests, status, attempt, result, evidence, review, human_decision.

Agent registry minimum: agent_id, role, model, capabilities, trust_level, task_count, success_rate, supervisor_agreement, human_agreement, avg_latency, failure_rate.

## Do not

Fine-tune models. Self-promotion. Publish content. Bypass LLM Gateway for prod path.
