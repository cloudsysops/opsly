# Cyber Neo — Contributor Guidelines

## What is Cyber Neo?

An open-source cybersecurity analysis agent that runs as a Claude Code plugin. It scans local projects for security vulnerabilities across OWASP 2025 Top 10 and CWE Top 25 categories, then generates prioritized reports with actionable remediation guidance.

## Project Structure

```
cyber-neo/
├── .claude-plugin/plugin.json         # Plugin metadata
├── .gitignore                         # Git ignore rules
├── skills/cyber-neo/
│   ├── SKILL.md                       # Main orchestration prompt (THE PRODUCT)
│   ├── scripts/                       # Python helper scripts
│   │   ├── scan_secrets.py            # Batch regex secret scanner
│   │   └── check_lockfiles.py         # Lock file integrity checker
│   └── references/                    # Security knowledge base files
│       ├── owasp-top-10.md            # OWASP 2025 classification
│       ├── cwe-top-25.md              # CWE severity mappings
│       ├── secrets-patterns.md        # Secret detection regex patterns
│       ├── auth-authz-patterns.md     # Authentication/authorization
│       ├── crypto-patterns.md         # Cryptographic security
│       ├── web-security-patterns.md   # Headers, CSRF, SSRF, uploads
│       ├── error-handling-patterns.md # Exception management
│       ├── logging-patterns.md        # Logging security
│       ├── cicd-security.md           # CI/CD pipeline security
│       ├── supply-chain.md            # Supply chain risks
│       ├── lang-javascript.md         # JS/Node.js/React/Next.js patterns
│       ├── lang-python.md             # Python/Django/Flask/FastAPI patterns
│       ├── iac-docker.md              # Docker/Compose security
│       └── report-template.md         # Report output format
├── CLAUDE.md                          # This file
├── LICENSE                            # MIT
└── README.md                          # User documentation
```

## Key Design Principles

1. **Claude IS the analysis engine.** SKILL.md is the product. Reference files are the knowledge base. Python scripts handle only batch processing tasks (regex scanning thousands of files).

2. **READ-ONLY on target projects.** Never modify the project being scanned. Never execute project code. Never install packages.

3. **External tools are optional enhancements.** The agent works without Semgrep, Trivy, or Gitleaks — it falls back to Claude-native analysis using Grep/Read with patterns from reference files.

4. **Every finding gets classified.** All findings must have a CWE ID, OWASP 2025 category, severity score, and actionable remediation with code examples.

## Contributing Reference Files

Reference files are pure markdown knowledge bases. They follow this structure:

```markdown
# Category Name

## Pattern Name (CWE-XXX)
**Severity:** high
**OWASP:** A0X:2025

**What to look for:**
- Grep pattern: `regex_here`
- Code pattern description

**Vulnerable:**
\`\`\`language
vulnerable code example
\`\`\`

**Secure:**
\`\`\`language
fixed code example
\`\`\`
```

When adding patterns:
- Include grep-ready regex patterns Claude can use with the Grep tool
- Always include both vulnerable AND secure code examples
- Map to CWE and OWASP categories
- Assign appropriate severity
- Note common false positives

## Contributing Scripts

Scripts must:
- Use only Python standard library (no pip dependencies)
- Accept a target directory as argument
- Output JSON to stdout
- Exit 0 for success, 1 for findings, 2 for blocking (pre-commit hooks)
- Never modify the target project

## Testing

Test against deliberately vulnerable projects:
- OWASP Juice Shop (Node.js)
- DVWA (PHP)
- WebGoat (Java)
- django.nV (Django)
- Create your own test fixtures with planted vulnerabilities
