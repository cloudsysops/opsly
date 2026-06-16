# npm Audit Exemptions

**Date:** 2026-06-16  
**Status:** Approved for MVP phase  
**Review:** Security team

## Known High-Severity Vulnerabilities (Dev Dependencies Only)

### 1. esbuild (packages/provisioning)
- **CVE:** GHSA-gv7w-rqvm-qjhr, GHSA-g7r4-m6w7-qqqr
- **Severity:** HIGH
- **Scope:** Development dependency (vite → vitest → provisioning package)
- **Risk:** RCE via NPM_CONFIG_REGISTRY (affects Deno, not Node production)
- **Remediation:** Requires vitest major version upgrade (5.x), pending Phase 2
- **Recommendation:** ACCEPT for MVP — not exposed in production code
- **Owner:** @opsly-tech

### 2. tmp (node_modules)
- **CVE:** GHSA-7c78-jf6q-g5cm
- **Severity:** HIGH
- **Scope:** Development dependency (external-editor → tmp)
- **Risk:** Type-confusion path traversal in temporary file handling
- **Remediation:** Upgrade external-editor or replace with alternative
- **Recommendation:** ACCEPT for MVP — only used in development workflows, not production
- **Owner:** @opsly-tech

## Policy

- **Production code:** No high/critical vulnerabilities allowed
- **Development code:** High/critical acceptable if:
  - Not exposed in production bundles
  - Documented with remediation plan
  - Approved by security team
  
## Audit Command with Exemptions

To run audit with dev-dependency exemptions:
```bash
npm audit --audit-level=moderate --omit=dev
```

## Next Steps

- **Phase 2:** Upgrade vitest & external-editor to latest versions
- **Weekly review:** Run full audit via `npm audit --json` without omissions
- **Incident:** If production exposure discovered, immediately escalate to security@intcloudsysops.com
