# Cyber Neo Security Report Template

This document defines the structure and rules for generating the final security report in Phase 7.

---

## Report Structure

```markdown
# Cyber Neo Security Report

**Project:** {name}
**Path:** {path}
**Date:** {YYYY-MM-DD}
**Tech Stack:** {detected languages, frameworks}
**Scan Coverage:** {percentage} — {what was scanned vs skipped}

---

## Executive Summary

**Risk Score:** {X}/100 (calculated from findings)
**Overall Assessment:** {Critical / High Risk / Medium Risk / Low Risk / Secure}

| Severity | Count |
|----------|-------|
| Critical | N |
| High     | N |
| Medium   | N |
| Low      | N |
| Info     | N |

**Top 3 Priority Actions:**
1. {Most critical finding with one-line fix description}
2. {Second priority}
3. {Third priority}

---

## Findings

### Critical Findings

#### [CN-001] {Finding Title}
- **Severity:** Critical (CVSS ~9.0+)
- **CWE:** CWE-XXX ({name})
- **OWASP:** A0X:2025 ({name})
- **Location:** `{file}:{line}`
- **Description:** {What the vulnerability is and why it matters}
- **Evidence:**
  ```{language}
  {vulnerable code snippet}
  ```
- **Remediation:**
  ```{language}
  {fixed code snippet}
  ```
- **References:** {links to CWE, OWASP, or relevant docs}

### High Findings

#### [CN-002] {Finding Title}
- **Severity:** High (CVSS ~7.0-8.9)
- **CWE:** CWE-XXX ({name})
- **OWASP:** A0X:2025 ({name})
- **Location:** `{file}:{line}`
- **Description:** {What the vulnerability is and why it matters}
- **Evidence:**
  ```{language}
  {vulnerable code snippet}
  ```
- **Remediation:**
  ```{language}
  {fixed code snippet}
  ```
- **References:** {links to CWE, OWASP, or relevant docs}

### Medium Findings

#### [CN-003] {Finding Title}
- **Severity:** Medium (CVSS ~4.0-6.9)
- **CWE:** CWE-XXX ({name})
- **OWASP:** A0X:2025 ({name})
- **Location:** `{file}:{line}`
- **Description:** {What the vulnerability is and why it matters}
- **Evidence:**
  ```{language}
  {vulnerable code snippet}
  ```
- **Remediation:**
  ```{language}
  {fixed code snippet}
  ```
- **References:** {links to CWE, OWASP, or relevant docs}

### Low & Informational Findings

#### [CN-004] {Finding Title}
- **Severity:** Low (CVSS ~0.1-3.9) | Info
- **CWE:** CWE-XXX ({name}) | N/A
- **Location:** `{file}:{line}`
- **Description:** {What the issue is}
- **Remediation:** {Brief fix description}

---

## Dependency Vulnerabilities

{If SCA tools were available, render a table:}

| Package | Current | CVE | Severity | Fix Version |
|---------|---------|-----|----------|-------------|
| lodash  | 4.17.15 | CVE-2020-8203 | High | 4.17.21 |

{If no SCA tools were detected:}

> Dependency vulnerability scanning requires Trivy, npm audit, or pip-audit. None were detected. Install one to enable SCA.

---

## Supply Chain Assessment
- **Lock file status:** {present/missing/issues}
- **Dependency pinning:** {assessment}
- **CI/CD security:** {assessment}

---

## Scan Metadata
- **Scanner:** Cyber Neo v0.1.0
- **Duration:** {time}
- **External tools used:** {list or "none — Claude-native analysis only"}
- **Files scanned:** {count}
- **Files skipped:** {count} ({reason})
```

---

## Risk Score Calculation

The risk score is a weighted sum of findings by severity, capped at 100.

### Formula

```
risk_score = min(100, (critical * 25) + (high * 10) + (medium * 3) + (low * 1) + (info * 0))
```

### Weight Table

| Severity | Points per Finding |
|----------|-------------------|
| Critical | 25 |
| High     | 10 |
| Medium   | 3 |
| Low      | 1 |
| Info     | 0 |

### Overall Assessment Mapping

| Score Range | Assessment |
|-------------|-----------|
| 0           | Secure |
| 1-15        | Low Risk |
| 16-40       | Medium Risk |
| 41-70       | High Risk |
| 71-100      | Critical |

### Examples

- 2 Critical + 1 High + 3 Medium = (2 * 25) + (1 * 10) + (3 * 3) = 69 -> High Risk
- 1 High + 2 Medium + 5 Low = (1 * 10) + (2 * 3) + (5 * 1) = 21 -> Medium Risk
- 4 Critical = (4 * 25) = 100 -> Critical

---

## Finding ID Assignment

Finding IDs follow the format `CN-XXX` where XXX is a zero-padded sequential number.

### Rules

1. IDs are assigned in the order findings appear in the report (Critical first, then High, Medium, Low, Info).
2. Numbering starts at CN-001 and increments sequentially.
3. IDs are never reused within a single report.
4. If a finding is removed during deduplication, its ID is not assigned (no gaps should exist in the final report).

### Example Sequence

```
CN-001  Critical  SQL Injection in login handler
CN-002  Critical  Hardcoded database credentials
CN-003  High      Missing CSRF protection
CN-004  High      Insecure session configuration
CN-005  Medium    Verbose error messages
CN-006  Low       Missing security headers
CN-007  Info      No .dockerignore file
```

---

## Deduplication Rules

When the same vulnerability is detected multiple times, apply these rules to avoid noise:

### Same File + Same Line + Same CWE = One Finding

If two or more detections point to the same file, same line number, and same CWE, they are considered duplicates. Keep only one entry.

- **Prefer the higher severity** if severities differ.
- **Prefer the finding with more context** (better evidence, clearer remediation).

### Same CWE Across Multiple Files = Separate Findings, One Per File

Each distinct file location gets its own finding ID, even if the CWE is the same.

Example:
```
CN-001  CWE-89  SQL Injection in /api/users.py:42
CN-002  CWE-89  SQL Injection in /api/orders.py:87
```

### Same File + Different Lines + Same CWE = Consolidate if Nearby

If the same vulnerability type appears on multiple lines within the same function or block (within ~10 lines), consolidate into a single finding and note all affected lines.

If the occurrences are in different functions or distant parts of the file, keep them as separate findings.

### Pattern-Based Findings

If the same vulnerability pattern appears in more than 5 files (e.g., missing input validation across many endpoints), consolidate into a single finding with:
- A representative example in Evidence
- A list of all affected locations
- A note: "Found in N locations. Representative example shown."

---

## Ordering Rules

Findings must be ordered within the report as follows:

### Primary Sort: Severity (Descending)

1. Critical
2. High
3. Medium
4. Low
5. Info

### Secondary Sort: OWASP Category (Ascending)

Within the same severity level, order by OWASP category number:

1. A01:2025 Broken Access Control
2. A02:2025 Security Misconfiguration
3. A03:2025 Software Supply Chain Failures
4. A04:2025 Cryptographic Failures
5. A05:2025 Injection
6. A06:2025 Insecure Design
7. A07:2025 Authentication Failures
8. A08:2025 Software or Data Integrity Failures
9. A09:2025 Security Logging and Monitoring Failures
10. A10:2025 Mishandling of Exceptional Conditions

### Tertiary Sort: File Path (Alphabetical)

If severity and OWASP category are the same, sort alphabetically by file path.

---

## CVSS Severity Ranges

For reference when assigning severity:

| Severity | CVSS Range |
|----------|-----------|
| Critical | 9.0 - 10.0 |
| High     | 7.0 - 8.9 |
| Medium   | 4.0 - 6.9 |
| Low      | 0.1 - 3.9 |
| Info     | 0.0 (no CVSS) |

---

## Special Sections

### When No Findings Exist

If the scan produces zero findings of any severity:

```markdown
## Findings

No security vulnerabilities were identified during this scan.

**Note:** This does not guarantee the absence of vulnerabilities. Consider:
- Running with additional SCA tools (Trivy, npm audit, pip-audit)
- Performing dynamic application security testing (DAST)
- Conducting manual penetration testing for business logic flaws
```

### When External Tools Were Available

If tools like Trivy, npm audit, or Semgrep were detected and used, include their raw output in a collapsible section:

```markdown
<details>
<summary>Raw Trivy Output</summary>

{trivy output here}

</details>
```

### Scan Coverage Calculation

```
coverage = (files_scanned / total_eligible_files) * 100
```

Eligible files exclude:
- Binary files
- Vendor/node_modules directories
- Generated code (if detectable)
- Files larger than 100KB (note these as skipped)

Always report what was skipped and why, so the user knows what was not covered.
