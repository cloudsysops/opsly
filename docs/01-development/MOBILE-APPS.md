---
status: canon
owner: operations
last_review: 2026-09-07
---

# Mobile apps — Capacitor Live-URL

One native shell pattern for every product: **Capacitor 8 + Live-URL**. No second Expo/RN monorepo without an ADR.

| App | App ID | Default URL | Config | Wrappers |
| --- | --- | --- | --- | --- |
| Peskids | `com.peskids.app` | `https://www.peskids.com` | `apps/peskids/capacitor.config.ts` | `scripts/peskids-cap-*.sh` |
| ICSO | `com.intcloudsysops.icso` | `https://icso.op-sly.com` | `apps/icso/capacitor.config.ts` | `scripts/icso-cap-*.sh` |

Registry: [`config/mobile-apps.json`](../../config/mobile-apps.json)  
Shared helper: [`scripts/cap-mobile.sh`](../../scripts/cap-mobile.sh)

```bash
./scripts/cap-mobile.sh peskids android --dry-run
./scripts/cap-mobile.sh icso ios --dry-run
./scripts/peskids-cap-android.sh --build
./scripts/icso-cap-android.sh --build
```

`apps/intcloudsysops/` is **not** a mobile target. It is a leftover tenant tree. Do not add Capacitor there.

## Docs

- Peskids: [`docs/tenants/peskids/MOBILE-APP.md`](../tenants/peskids/MOBILE-APP.md)
- ICSO: [`docs/tenants/intcloudsysops/MOBILE-APP.md`](../tenants/intcloudsysops/MOBILE-APP.md)
