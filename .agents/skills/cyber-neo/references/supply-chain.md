# Supply Chain Security Patterns

OWASP A03:2025 — Software Supply Chain Failures, A08:2025 — Software and Data Integrity Failures
Covers dependency confusion, typosquatting, lock file security, dependency health, and integrity verification.

---

## 1. Dependency Confusion

**CWE:** CWE-427 (Uncontrolled Search Path Element), CWE-829 (Inclusion of Functionality from Untrusted Control Sphere)
**OWASP:** A08:2025
**Severity:** CRITICAL

When a private package name exists without proper registry scoping, an attacker publishes a higher-versioned package with the same name on the public registry. Package managers default to the higher version, pulling the malicious public package instead of the legitimate private one.

### Detection Approach

```
# Check for private packages without org scope
# In package.json — look for unscoped internal package names
"dependencies":\s*\{[^}]*"(?!@)[a-z][a-z0-9-]*":\s*"
# Unscoped packages that look internal (common prefixes)
"(internal-|private-|corp-|company-|myorg-)[a-z0-9-]+"

# Missing .npmrc registry pinning
# Check for ABSENCE of .npmrc or missing registry config
registry\s*=
@.*:registry\s*=

# Python — missing pip.conf / pip.ini
index-url\s*=
extra-index-url\s*=

# Check for private registry references without pinning
"publishConfig":\s*\{[^}]*"registry"
```

### Vulnerable Configuration

**npm — No registry scoping:**
```json
// package.json — VULNERABLE
{
  "dependencies": {
    "my-company-auth": "^1.0.0",
    "my-company-utils": "^2.3.0",
    "internal-logger": "^1.2.0"
  }
}
// No .npmrc file — npm resolves from public registry
// Attacker publishes my-company-auth@99.0.0 on npmjs.com
```

**pip — No index pinning:**
```
# requirements.txt — VULNERABLE
company-ml-pipeline==1.2.3
internal-data-utils==0.9.0
# pip install will check PyPI first (or in addition to private index)
```

### Secure Configuration

**npm — Scoped packages with registry pinning:**
```json
// package.json — SECURE
{
  "dependencies": {
    "@mycompany/auth": "^1.0.0",
    "@mycompany/utils": "^2.3.0",
    "@mycompany/logger": "^1.2.0"
  }
}
```

```ini
# .npmrc — SECURE: Scope pinned to private registry
@mycompany:registry=https://npm.internal.company.com/
//npm.internal.company.com/:_authToken=${NPM_TOKEN}
# All @mycompany/* packages resolve from private registry only
```

**pip — Registry pinning:**
```ini
# pip.conf — SECURE
[global]
index-url = https://pypi.internal.company.com/simple/
# Only use the private registry; block public PyPI entirely

# Or if you need both, use --extra-index-url with caution:
# extra-index-url = https://pypi.org/simple/
# But this still allows confusion — prefer scoping or vendoring
```

**Artifactory/Nexus proxy (best):**
```
# Use a registry proxy that merges private + public and prioritizes private
# Configure npm/pip to use ONLY the proxy as the single source of truth
# The proxy applies namespace rules to prevent confusion attacks
```

---

## 2. Typosquatting

**CWE:** CWE-829 (Inclusion of Functionality from Untrusted Control Sphere)
**OWASP:** A08:2025
**Severity:** HIGH

Attackers publish packages with names similar to popular libraries — misspellings, character swaps, missing/extra hyphens. A single typo in package.json or requirements.txt installs malware.

### Known Typosquatting Examples

| Legitimate Package | Typosquat Examples | Attack Type |
|---|---|---|
| lodash | lodas, lodash-utils, lodahs | Character omission/swap |
| express | expresss, expres, xpress | Extra/missing characters |
| react | raect, recat, react-js | Transposition, suffix |
| requests (Python) | request, requets, python-requests | Singular, swap |
| urllib3 (Python) | urllib, urlib3, urllib4 | Typo, version bump |
| colors (npm) | colour, color, co1ors | Regional spelling, l33t |
| event-stream | event_stream, eventstream | Separator variation |
| crossenv | cross-env (legitimate is cross-env) | Hyphen confusion |
| python-dateutil | python-dateutl, python-dateutils | Typo, extra s |
| beautifulsoup4 | beautifulsoup, beautifullsoup4 | Missing version, typo |
| tensorflow | tenserflow, tensor-flow, tensorflows | Common misspelling |
| pytorch | pytorh, py-torch, pytoch | Typo, hyphen addition |
| eslint | eslint, es-lint, eslnt | Missing char, hyphen |

### Detection Approach

```
# Automated detection — compare installed packages against known-good list
# Tools: socket.dev, npm audit signatures, pip-audit, Snyk

# Manual review signals:
# - Package published very recently
# - Very low download count
# - Package name differs from popular package by 1-2 characters
# - Single maintainer, no repository link
# - Sparse or copied README

# Check for suspicious package names in manifests
# Look for Levenshtein distance <= 2 from popular packages
```

### Prevention

```json
// package.json — Review every dependency name carefully
// Use lockfiles to prevent silent package substitution
// Use npm audit signatures to verify package provenance

// .npmrc — Restrict to specific registries
// Use organization-approved package lists
```

**Tooling:**
```bash
# npm — Verify package provenance
npm audit signatures

# Use Socket.dev or similar for real-time typosquat detection
# Use Snyk or Dependabot for known vulnerability scanning

# Python — pip-audit
pip-audit --require-hashes -r requirements.txt
```

---

## 3. Lock File Security

**CWE:** CWE-353 (Missing Support for Integrity Check), CWE-829
**OWASP:** A08:2025
**Severity:** HIGH

Lock files pin exact dependency versions and record integrity hashes. Without them, builds are non-reproducible, and a compromised version can silently enter the dependency tree.

### Detection Approach

```
# Check for MISSING lock files
# Project has package.json but no package-lock.json or yarn.lock
# Project has Pipfile but no Pipfile.lock
# Project has pyproject.toml but no poetry.lock
# Project has Cargo.toml but no Cargo.lock
# Project has Gemfile but no Gemfile.lock
# Project has go.mod but no go.sum
# Project has composer.json but no composer.lock

# Check if lock file is in .gitignore (VULNERABLE)
# .gitignore containing:
package-lock\.json
yarn\.lock
Pipfile\.lock
poetry\.lock
Cargo\.lock
Gemfile\.lock
composer\.lock

# Check for floating version ranges WITHOUT lock file
# package.json:
"\^|~|\*|>=|>"\s*:  # Floating ranges
"latest"            # Always latest

# requirements.txt without pinning:
^[a-zA-Z][a-zA-Z0-9_-]+$          # No version at all
.*>=\d+                            # Minimum only
```

### Vulnerable Configuration

**Missing lock file:**
```json
// package.json — VULNERABLE without lock file
{
  "dependencies": {
    "express": "^4.18.0",    // Could resolve to 4.18.0, 4.19.2, 4.21.0...
    "lodash": "~4.17.0",     // Minor flexibility
    "left-pad": "*"          // ANY version
  }
}
// Without package-lock.json, every install may get different versions
```

**Lock file in .gitignore:**
```gitignore
# .gitignore — VULNERABLE
node_modules/
package-lock.json    # WRONG: Lock file should be committed
yarn.lock            # WRONG: Lock file should be committed
```

**requirements.txt without pinning:**
```
# VULNERABLE: No version pinning
requests
flask
sqlalchemy>=1.4
# Every pip install may get different versions
```

### Secure Configuration

**Committed lock files:**
```gitignore
# .gitignore — SECURE: Lock files NOT listed
node_modules/
*.pyc
__pycache__/
# package-lock.json is committed (not listed here)
```

**Pinned versions with lock file:**
```json
// package.json with package-lock.json committed
{
  "dependencies": {
    "express": "^4.18.2"
  }
}
// npm ci (not npm install) in CI — uses lock file exactly
```

**Python — fully pinned:**
```
# requirements.txt — SECURE: Exact versions with hashes
requests==2.31.0 \
    --hash=sha256:58cd2187c01e70e6e26505bca751777aa9f2ee0b7f4300988b709f44e013003eb
flask==3.0.0 \
    --hash=sha256:21128f47e4e3b9d597a3e8521a329bf56909b690fcc3fa3e477725aa81367638
```

### Lock File Requirements by Ecosystem

| Ecosystem | Manifest | Lock File | CI Install Command |
|-----------|----------|-----------|-------------------|
| npm | package.json | package-lock.json | `npm ci` |
| yarn | package.json | yarn.lock | `yarn install --frozen-lockfile` |
| pnpm | package.json | pnpm-lock.yaml | `pnpm install --frozen-lockfile` |
| pip | requirements.txt | (use --require-hashes) | `pip install --require-hashes -r requirements.txt` |
| pipenv | Pipfile | Pipfile.lock | `pipenv install --deploy` |
| poetry | pyproject.toml | poetry.lock | `poetry install --no-interaction` |
| cargo | Cargo.toml | Cargo.lock | `cargo build --locked` |
| bundler | Gemfile | Gemfile.lock | `bundle install --frozen` |
| go | go.mod | go.sum | `go build` (verifies go.sum) |
| composer | composer.json | composer.lock | `composer install --no-dev` |

---

## 4. Dependency Health

**CWE:** CWE-1104 (Use of Unmaintained Third-Party Components), CWE-1395 (Dependency on Vulnerable Third-Party Component)
**OWASP:** A03:2025 (Software Supply Chain Failures)
**Severity:** MEDIUM-HIGH

Abandoned, unmaintained, or single-maintainer packages are high-risk dependencies. They won't receive security patches and may be targeted for takeover.

### Detection Approach

```
# Signals of abandoned packages:
# - Last publish > 2 years ago
# - No commits in > 1 year
# - Archived repository
# - Deprecated flag on npm/PyPI
# - Open security issues with no response

# Signals of high-risk packages:
# - Single maintainer (bus factor = 1)
# - No CI/CD pipeline
# - No tests
# - Very few downloads but used for critical functionality
# - Recently transferred ownership

# Tools for automated detection:
# npm outdated
# npm audit
# pip-audit
# safety check (Python)
# cargo audit (Rust)
# bundle audit (Ruby)
# socket.dev (multi-ecosystem)
# Snyk, Dependabot, Renovate
```

### Risk Assessment

```bash
# npm — Check package metadata
npm view <package> time modified
npm view <package> maintainers
npm view <package> repository

# Check for deprecation
npm view <package> deprecated

# Check dependency tree depth
npm ls --all | wc -l
npm ls --all --depth=0  # Direct deps only
```

### Secure Practices

```json
// package.json — Track and review dependencies
{
  "dependencies": {
    // PREFER: Well-maintained, multi-maintainer packages
    "express": "^4.18.2",     // 200+ contributors, active
    "lodash": "^4.17.21"      // Widely used, maintained
  },
  "overrides": {
    // SECURE: Force specific versions of transitive deps
    "vulnerable-transitive-dep": ">=2.0.1"
  }
}
```

```yaml
# .github/dependabot.yml — Automated dependency updates
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 10
    reviewers:
      - "security-team"
```

### Dependency Tree Risk Indicators

| Risk Factor | Description | Action |
|-------------|-------------|--------|
| Abandoned (2+ years) | No updates, no maintainer response | Replace or fork |
| Single maintainer | One person controls releases | Evaluate alternatives |
| Deep dependency tree | 500+ transitive deps | Audit, consider alternatives |
| Known malicious versions | npm advisories, Snyk DB | Update immediately |
| Recent ownership transfer | New maintainer, possible takeover | Verify legitimacy |
| No repository link | Cannot audit source code | Avoid or vendor |
| Post-install scripts | Arbitrary code at install time | Audit scripts, use --ignore-scripts |

---

## 5. Integrity Verification

**CWE:** CWE-353 (Missing Support for Integrity Check), CWE-494 (Download of Code Without Integrity Check)
**OWASP:** A08:2025
**Severity:** HIGH

Without integrity verification, a compromised registry, CDN, or man-in-the-middle attacker can substitute malicious code for legitimate packages.

### Detection Approach

```
# npm — Check for missing integrity in lock file
# package-lock.json should have "integrity" fields:
"integrity":\s*"sha512-

# CDN scripts without SRI
<script\s+src=["']https?://
# Should have: integrity="sha384-..." crossorigin="anonymous"

# Absence of SRI on CDN-loaded scripts
<script\s+src=["']https?://cdn
<script\s+src=["']https?://unpkg
<script\s+src=["']https?://cdnjs
<script\s+src=["']https?://jsdelivr
<link\s+.*href=["']https?://cdn

# Go — check for go.sum
go\.sum

# pip — check for --require-hashes
pip install.*--require-hashes
```

### Vulnerable Code

**CDN scripts without SRI:**
```html
<!-- VULNERABLE: No integrity check — CDN compromise = XSS -->
<script src="https://cdn.jsdelivr.net/npm/lodash@4.17.21/lodash.min.js"></script>
<script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
<link rel="stylesheet" href="https://cdn.example.com/bootstrap.min.css">
```

**npm lock without integrity:**
```json
{
  "packages": {
    "node_modules/express": {
      "version": "4.18.2",
      "resolved": "https://registry.npmjs.org/express/-/express-4.18.2.tgz"
      // VULNERABLE: Missing "integrity" field
    }
  }
}
```

**pip without hashes:**
```
# VULNERABLE: No hash verification
requests==2.31.0
# A compromised PyPI mirror could serve different code
```

### Secure Code

**CDN scripts with SRI:**
```html
<!-- SECURE: Subresource Integrity (SRI) with crossorigin -->
<script
  src="https://cdn.jsdelivr.net/npm/lodash@4.17.21/lodash.min.js"
  integrity="sha384-abc123def456..."
  crossorigin="anonymous"></script>

<script
  src="https://unpkg.com/react@18/umd/react.production.min.js"
  integrity="sha384-xyz789..."
  crossorigin="anonymous"></script>

<link
  rel="stylesheet"
  href="https://cdn.example.com/bootstrap.min.css"
  integrity="sha384-qrs..."
  crossorigin="anonymous">
```

**npm lock with integrity:**
```json
{
  "packages": {
    "node_modules/express": {
      "version": "4.18.2",
      "resolved": "https://registry.npmjs.org/express/-/express-4.18.2.tgz",
      "integrity": "sha512-J3M7OkafLYG5Kg0+Y5UkHkPBN3VFOhpE+OZjQpTZBkRm0kz4mXp3EB4QoLaFn3ZAs8IUPMFks9e2MIrp5Elg=="
    }
  }
}
```

**pip with hashes:**
```
# SECURE: Hash pinning — pip verifies every download
requests==2.31.0 \
    --hash=sha256:58cd2187c01e70e6e26505bca751777aa9f2ee0b7f4300988b709f44e013003eb
certifi==2024.2.2 \
    --hash=sha256:dc383c07b76109f368f6106eee2b593b04a011ea4d55f652c6ca24a754d1cdd1
```

**Go modules with checksum verification:**
```bash
# SECURE: Go automatically verifies go.sum
# Enable the checksum database (default)
GONOSUMCHECK=off
GONOSUMDB=
GOFLAGS=-mod=readonly  # Fail if go.sum needs updating

# go.sum contains cryptographic hashes for all dependencies
# Go verifies against sum.golang.org by default
```

### Generating SRI Hashes

```bash
# Generate SRI hash for a CDN resource
curl -s https://cdn.example.com/library.js | openssl dgst -sha384 -binary | openssl base64 -A
# Output: sha384-oqVuAfXRKap7fdgcCY5uykM6+R9GqQ8K/uxy9rx7HNQlGYl1kPzQho1wx4JwY8wC

# Or use srihash.org

# npm — Regenerate lock file with integrity
rm -rf node_modules package-lock.json
npm install
# Modern npm includes integrity fields by default
```

---

## Summary Table

| Pattern | CWE | OWASP | Severity | Key Risk |
|---------|-----|-------|----------|----------|
| Dependency Confusion | CWE-427, CWE-829 | A08 | CRITICAL | Private package replaced by malicious public one |
| Typosquatting | CWE-829 | A08 | HIGH | Malware installed via misspelled package name |
| Lock File Security | CWE-353, CWE-829 | A08 | HIGH | Non-reproducible builds, silent version changes |
| Dependency Health | CWE-1104, CWE-1395 | A03 | MEDIUM-HIGH | Unpatched vulnerabilities, maintainer takeover |
| Integrity Verification | CWE-353, CWE-494 | A08 | HIGH | Tampered packages/scripts served to application |
