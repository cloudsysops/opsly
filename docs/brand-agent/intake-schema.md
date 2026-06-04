---
status: draft
owner: operations
last_review: 2026-06-04
type: tool-doc
tags:
  - opsly/tool
---

# Brand Agent Intake Schema

Run:

```bash
./scripts/brand-agent dry-run --client peskids
./scripts/brand-agent dry-run --input docs/examples/intake/icso.json
```

Required fields:

- `companyName`
- `shortName`
- `industry`
- `niche`
- `country`
- `language`
- `targetCustomer`
- `services`
- `brandTone`

Optional fields:

- `website`
- `instagram`
- `colorPreferences`
- `logoStyle`
- `tagline`
- `mission`
- `assets`

