---
agent_role: architect
max_steps: 8
goal: Design validation pipeline architecture
priority: 49000
---

# Task 2: Architect (OpenCode/Claude) - Validation Pipeline Design

Design the optimal validation pipeline for the autonomous execution system.

**Deliverable:** Create `docs/VALIDATION-PIPELINE-DESIGN.md`

**Include:**
1. **Current Flow:** Diagram of type-check → test → build (sequential)
2. **Optimizations:** 
   - Which validations can run in parallel?
   - Which must be sequential?
   - Estimated time savings?
3. **Error Handling:** How should failures in parallel validations be handled?
4. **Scalability:** How would this scale to 100 parallel jobs?
5. **Recommendation:** Single best approach with tradeoffs explained

**Format:** Markdown with ASCII diagrams or links to visual examples.

**Success:** Document is clear, actionable, and addresses all 5 sections.
