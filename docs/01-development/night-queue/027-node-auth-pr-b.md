---
id: node-auth-pr-b-027
status: pending
owner: claude-builder
agent: claude
created: 2026-09-11
requires_pr: true
risk: high
autonomy: supervised
---

# Trusted Nodes — PR B: per-node auth + capability enforcement

## Mission

Build the next focused security PR after TaskSourceGuard in #1196.

Do **not** redesign TaskSourceGuard. Reuse it.

## Scope

Implement per-node authentication/authorization for automated engineering execution.

Required identities:

- macbook-personal-01
- pc-gamer-openclaw-01
- vps-dragon-control-01

## Required behavior

- unique credential per node;
- node A credential cannot impersonate node B;
- disabled/unknown node denied;
- requested capability must be allowed;
- admin `PLATFORM_ADMIN_TOKEN` remains explicit human/break-glass path, not automated node identity;
- no credential values committed;
- safe audit fields only;
- no public ingress added;
- no production deploy.

## Tests

At minimum:

1. correct node + credential accepted;
2. wrong credential denied;
3. node A credential + node B id denied;
4. unknown node denied;
5. disabled node denied;
6. forbidden capability denied;
7. no token/secret echoed in logs/errors;
8. break-glass path is distinguishable in audit.

## Non-goals

- no secret rotation from code;
- no mTLS unless required by existing architecture;
- no second auth subsystem if existing utilities can be extended;
- no changes to Peskids runtime.

## Exit criteria

```
NODE_AUTH_PR_B

PR:
NODE_REGISTRY:
AUTH_BINDING:
CAPABILITY_ENFORCEMENT:
BREAK_GLASS:
TESTS:
SECURITY_NOTES:
BLOCKERS:
NEXT:
```

Builder != reviewer.
