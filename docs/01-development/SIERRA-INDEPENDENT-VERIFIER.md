# Sierra Independent Verifier

## Canonical flow

```text
Builder Agent
    ↓
PR + exact head SHA
    ↓
CI / security / tests
    ↓
Sierra Independent Verifier
    ↓
PASS | FAIL | BLOCKED
    ↓
merge readiness
```

The verifier is **read-only** and must be independent from the builder.

## Qualification

Qualified verifier identities are declared in
`config/independent-verifier-policy.json`.

Each profile has:

- a stable `profile_id`;
- an `agent_id`;
- a model family;
- a trust level;
- an independence group;
- granted specialties.

The current bootstrap profiles are Codex and GitHub Copilot. Their two
independence groups are intentionally distinct. Two Copilot login aliases do
not count as two independent verifiers.

The learning layer remains `@intcloudsysops/agent-learning`; it owns review
evidence, trust and scorecards. It does **not** create tasks.

## Quorum

Normal change:

```text
1 qualified verifier PASS → review gate PASS
```

Sensitive change:

```text
2 independent verifier groups PASS
+ required specialties covered
→ review gate PASS
```

Sensitive surfaces currently include:

- the verifier trust chain itself;
- GitHub workflows and repair/governance policies;
- auth, secrets and routing/infra;
- migrations, n8n and Peskids runtime surfaces.

Missing or stale evidence returns `BLOCKED`.

A `FAIL` or `BLOCKED` from a qualified exact-head verifier cannot be
overridden by a clean review from another verifier on the same head.

## Structured handback

Preferred verifier evidence:

```text
<!-- opsly-independent-verifier-v1
{
  "schema_version": "IndependentVerifierEvidenceV1",
  "head_sha": "<exact 40-char head>",
  "decision": "PASS",
  "specialties_checked": [
    "architecture",
    "security",
    "ci",
    "ownership",
    "blast-radius"
  ],
  "findings": [],
  "checks": ["diff", "CI", "security"],
  "reviewed_at": "<ISO timestamp>"
}
-->
```

Existing exact-head clean Codex/Copilot review wording remains accepted as
qualified evidence, so rollout does not require a second task store or another
review service.

## Human role

Human review is not the default operational gate.

- Normal changes may still use a trusted human approval as break-glass.
- Sensitive changes do not use human approval to satisfy verifier quorum.
- Product decisions, irreversible production risk, or disagreement between
  verifiers can still be escalated to a human.

## Trust-chain rule

A verifier/policy change cannot certify itself.

Because verifier files are classified sensitive, once this policy is active
they require two independent verifier groups. During bootstrap, the enabling PR
must also be reviewed independently by both groups before merge even though the
previous base policy cannot enforce the new quorum yet.

## Workpack

Generate an exact-head verifier workpack:

```bash
node scripts/ops/independent-verifier-workpack.mjs <PR> <40-char-head-sha> <builder>
```

The workpack points the reviewer at the
`sierra-independent-verifier` skill and provides the canonical evidence
marker.
