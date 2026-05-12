---
status: architecture-decision
owner: engineering + devops
date: 2026-05-08T16:00:00Z
adr: ADR-029
version: 1.0
---

# ADR-029: MCP Integration for Opsly Multi-Agent Orchestration

**Decision:** Implement Model Context Protocol (MCP) as unified tool layer for Opsly orchestrator, with explicit security boundaries (READ/WRITE/SHELL/SECRETS), GitHub as source of truth, and role-based agent architecture.

---

## Executive Summary

MCP provides safe, composable tool access across heterogeneous agents (Claude API, Codex CLI, OpenCode IDE). For Opsly, we adopt MCP as the **single tool abstraction layer** with:

- ✅ **Opsly Orchestrator** = decision engine + task router
- ✅ **MCP Servers** = secure, sandboxed tool exposures
- ✅ **IDE Agents** = specialized executors (dev, qa, security, architect)
- ✅ **GitHub** = durable source of truth
- ✅ **Security hardening** = READ/WRITE/SHELL/SECRETS isolation

**Why MCP over direct API calls:**
- Composable (swap tools, add new ones, disable dangerous ones)
- Agent-agnostic (Claude, Codex, OpenCode, future models)
- Audit-friendly (all tool calls logged, reviewable)
- Safe defaults (READ only, WRITE requires approval)

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                    OPSLY CONTROL PLANE (Orchestrator)           │
│  ┌────────────┐ ┌──────────────┐ ┌───────────────────────────┐  │
│  │ Task Router│ │Context Builder│ │  Prompt Registry + Roles  │  │
│  └────────────┘ └──────────────┘ └───────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
                                ↓
                    ┌─────────────────────┐
                    │   MCP GATEWAY       │
                    │ (Route, Auth, Audit)│
                    └─────────────────────┘
                                ↓
        ┌───────────────────────┬───────────────────────┐
        │                       │                       │
   ┌─────────────┐      ┌──────────────┐      ┌──────────────┐
   │ READ Tools  │      │ WRITE Tools  │      │ SHELL Tools  │
   │ (default)   │      │ (approval)   │      │ (sandboxed)  │
   │             │      │              │      │              │
   │ • GitHub    │      │ • GitHub     │      │ • Bash       │
   │ • Filesystem│      │ • Supabase   │      │ • Docker     │
   │ • Browser   │      │ • Linear     │      │ • Git CLI    │
   │ • Search    │      │ • Stripe     │      │              │
   └─────────────┘      └──────────────┘      └──────────────┘
        ↓                    ↓                      ↓
   ┌─────────────────────────────────────────────────────┐
   │     MCP Server Layer (OpenCode/Claude SDK)         │
   │  ┌──────────┐ ┌──────────┐ ┌───────────────────┐   │
   │  │GitHub MCP│ │Filesystem│ │Postgres/Supabase  │   │
   │  └──────────┘ └──────────┘ └───────────────────┘   │
   │  ┌──────────┐ ┌──────────┐ ┌───────────────────┐   │
   │  │Linear MCP│ │Shell MCP │ │Browser/Docs MCP   │   │
   │  └──────────┘ └──────────┘ └───────────────────┘   │
   └─────────────────────────────────────────────────────┘
        ↓
   ┌──────────────────────────────────────────┐
   │      AGENT EXECUTORS (IDE / API)        │
   │  ┌────────────┐ ┌────────────┐          │
   │  │ Architect  │ │ Developer  │          │
   │  │ (design)   │ │ (code)     │          │
   │  └────────────┘ └────────────┘          │
   │  ┌────────────┐ ┌────────────┐          │
   │  │ QA         │ │ Security   │          │
   │  │ (test)     │ │ (review)   │          │
   │  └────────────┘ └────────────┘          │
   │  ┌────────────┐ ┌────────────┐          │
   │  │ Docs       │ │ Research   │          │
   │  │ (write)    │ │ (explore)  │          │
   │  └────────────┘ └────────────┘          │
   └──────────────────────────────────────────┘
        ↓
   ┌──────────────────────────────────────────┐
   │       ULTIMATE SOURCE OF TRUTH           │
   │           GitHub Repository              │
   │  (config, code, docs, agent prompts)     │
   └──────────────────────────────────────────┘
```

---

## Security Model (Critical)

### Rule 1: Three Tool Tiers

```
┌─────────────────────────────────────────────────────────────┐
│ TIER 1: READ Tools (Default, No Approval)                  │
├─────────────────────────────────────────────────────────────┤
│ • GitHub read (clone, list branches, read files)           │
│ • Filesystem read (local files, directories)               │
│ • Browser/docs (fetch URLs, search documentation)          │
│ • Search (semantic + regex across codebase)                │
│ • Postgres SELECT (read-only queries)                      │
│                                                              │
│ Risk Level: LOW (read-only, no side effects)               │
│ Audit: Logged, but no approval needed                       │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ TIER 2: WRITE Tools (Explicit Approval Required)           │
├─────────────────────────────────────────────────────────────┤
│ • GitHub write (push, merge, create branches)              │
│ • Filesystem write (modify files, create files)            │
│ • Supabase/Postgres INSERT/UPDATE/DELETE                   │
│ • Linear/Jira create issues, update tickets                │
│ • Stripe API calls (payment operations)                    │
│ • Docker image builds (resource-intensive)                 │
│                                                              │
│ Risk Level: MEDIUM (state-changing, reversible)            │
│ Approval: Human review required (via Discord or GitHub)    │
│ Revert: Possible via git reset, DB rollback, etc.          │
│                                                              │
│ Example: Developer agent wants to git push                  │
│   → System asks: "Push to main? [Approve] [Deny]"         │
│   → Approval logged + audit trail created                  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ TIER 3: SHELL Tools (Sandboxed + Manual Only)             │
├─────────────────────────────────────────────────────────────┤
│ • Bash execution (limited whitelist of commands)           │
│ • Git CLI (clone, pull, rebase — no push from agent)       │
│ • Docker CLI (build, inspect — no production deploy)       │
│ • npm/yarn (install packages — sandboxed env)              │
│ • Custom scripts (from scripts/ directory only)            │
│                                                              │
│ Risk Level: HIGH (process-level access, RCE vectors)       │
│ Approval: Manual execution only (human types commands)     │
│ Sandbox: Timeouts (5 min max), resource limits, dry-run    │
│ Secrets: NEVER exposed to shell (use env vars, mocking)    │
│                                                              │
│ Example: Agent wants to run npm test                        │
│   → System says: "Use npm test tool instead"               │
│   → Shell access denied, redirects to safe wrapper         │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ BLOCKED: SECRETS (Always Sandboxed)                        │
├─────────────────────────────────────────────────────────────┤
│ • NEVER expose: API keys, DB passwords, SSH keys           │
│ • NEVER log: Auth tokens, Stripe secret keys               │
│ • NEVER transmit to agents: Production credentials         │
│ • Exception: Doppler SDK (read secrets, don't display)     │
│                                                              │
│ Implementation:                                              │
│   ✅ Use Doppler for secret management                     │
│   ✅ Agents call Doppler API (requires user auth)          │
│   ✅ Secrets injected at runtime, never in prompts         │
│   ✅ Prod secrets: Only in VPS, never to agents            │
└─────────────────────────────────────────────────────────────┘
```

### Rule 2: Approval Gates

```
┌─────────────────────────────────────────────────────────────┐
│ APPROVAL WORKFLOW                                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ Agent tries WRITE/SHELL operation:                         │
│                                                              │
│   Agent Request                                             │
│        ↓                                                    │
│   MCP Gateway (security check)                             │
│        ↓                                                    │
│   Is READ-only? → APPROVE (continue)                       │
│        ↓                                                    │
│   Is WRITE? → PAUSE (ask human)                            │
│        ├─ Post to Discord: "@ops Operation pending"        │
│        ├─ Show what changed: "Will commit 3 files"         │
│        ├─ Show who: "architect-agent (OpenCode)"           │
│        ├─ Show why: "Implementing feature X"               │
│        └─ [Approve] [Deny] [Review Changes]                │
│        ↓                                                    │
│   Is SHELL? → MANUAL ONLY                                  │
│        └─ Human types command, agent observes output       │
│        ↓                                                    │
│   [Audit Log Entry Created]                                │
│   ├─ Timestamp                                              │
│   ├─ Agent ID + role                                        │
│   ├─ Operation + parameters                                │
│   ├─ Approval status + approver                            │
│   └─ git commit hash (if applicable)                        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## MCP Server Implementations

### 1. GitHub MCP (READ + WRITE)

```python
# apps/mcp/servers/github-mcp.py
from anthropic import Anthropic

class GitHubMCPServer:
    """
    Tools:
      - read_file(path, branch)
      - list_branch_files(branch)
      - get_pr_diff(pr_number)
      - search_code(query, language)
      - create_branch(branch_name, from_branch)
      - push_changes(branch, files, message) [WRITE]
      - create_pr(branch, base, title) [WRITE]
      - merge_pr(pr_number) [WRITE, approval required]
    """
    
    def __init__(self, repo_owner, repo_name, token):
        self.client = Anthropic()
        self.repo = f"{repo_owner}/{repo_name}"
        self.token = token  # From Doppler, never exposed
        
    def read_file(self, path: str, branch: str = "main") -> str:
        """READ-only, always allowed"""
        # Fetch from GitHub API
        ...
        
    def push_changes(self, branch: str, files: dict, message: str):
        """WRITE operation, requires approval"""
        # Check approval gate
        if not self.get_approval(f"Push to {branch}: {message}"):
            return {"status": "DENIED", "reason": "User declined"}
        
        # Perform write
        ...
        return {"status": "APPROVED", "commit_hash": "abc123"}
```

### 2. Filesystem MCP (READ + WRITE)

```python
# apps/mcp/servers/filesystem-mcp.py

class FilesystemMCPServer:
    """
    Tools (restricted to /opt/opsly only):
      - read_file(path)
      - list_directory(path)
      - search_files(pattern)
      - create_file(path, content) [WRITE]
      - modify_file(path, old, new) [WRITE]
      - delete_file(path) [WRITE, needs approval]
    
    Security:
      - No access outside /opt/opsly
      - No symlink traversal
      - No shell metacharacters
    """
    
    def read_file(self, path: str) -> str:
        """READ-only, always allowed"""
        path = self.validate_path(path)
        with open(path, 'r') as f:
            return f.read()
    
    def create_file(self, path: str, content: str):
        """WRITE operation, approval required"""
        if not self.get_approval(f"Create file: {path}"):
            return {"status": "DENIED"}
        
        # Write file
        ...
```

### 3. Shell MCP (Sandboxed, Limited Commands)

```python
# apps/mcp/servers/shell-mcp.py

class ShellMCPServer:
    """
    SANDBOX RULES:
      - Max runtime: 5 minutes
      - Max memory: 512 MB
      - Max disk write: 100 MB
      - Whitelist of commands: npm, git, docker inspect, etc.
      - Blacklist: sudo, rm -rf, SSH, curl secrets URLs
    
    Tools (all require manual execution):
      - execute_command(cmd) [dry-run first]
      - test_command(cmd) [npm test, pytest, etc.]
      - build_command(cmd) [docker build, npm build]
    """
    
    ALLOWED_COMMANDS = {
        "npm": ["test", "build", "lint", "install"],
        "git": ["clone", "pull", "status", "log"],
        "docker": ["inspect", "ps", "logs"],
        "bash": ["scripts/*.sh"],  # Only scripts/ dir
    }
    
    def execute_command(self, cmd: str, dry_run: bool = True):
        """
        Manual only. Ask human first, then:
        1. Parse command (whitelist check)
        2. Run with timeout + resource limits
        3. Capture output
        4. Log everything
        """
        if not self.is_whitelisted(cmd):
            return {"status": "BLOCKED", "reason": "Command not whitelisted"}
        
        if not dry_run:
            approval = self.get_manual_approval(f"Run: {cmd}")
            if not approval:
                return {"status": "DENIED"}
        
        # Execute in container/sandbox
        result = subprocess.run(
            cmd,
            timeout=300,
            capture_output=True,
            cwd="/opt/opsly"
        )
        
        return {
            "status": "SUCCESS",
            "stdout": result.stdout,
            "stderr": result.stderr,
            "exit_code": result.returncode
        }
```

### 4. Postgres/Supabase MCP (READ + WRITE)

```python
# apps/mcp/servers/postgres-mcp.py

class PostgresMCPServer:
    """
    Tools:
      - query(sql) [READ-only check]
      - query_insert(table, rows) [WRITE, approval]
      - query_update(table, where, set) [WRITE, approval]
      - query_delete(table, where) [WRITE, approval]
      - describe_table(table_name)
      - list_tables()
    """
    
    def query(self, sql: str):
        """READ-only queries allowed by default"""
        if self.is_readonly(sql):
            return self.execute(sql)
        else:
            return {"error": "Only SELECT queries allowed. Use query_insert/update/delete for modifications"}
    
    def query_insert(self, table: str, rows: list[dict]):
        """WRITE operation, needs approval"""
        if not self.get_approval(f"INSERT into {table}: {len(rows)} rows"):
            return {"status": "DENIED"}
        
        # Execute
        ...
```

### 5. Linear/Jira MCP (READ + WRITE)

```python
# apps/mcp/servers/linear-mcp.py

class LinearMCPServer:
    """
    Tools:
      - list_issues(team)
      - get_issue(id)
      - search_issues(query)
      - create_issue(title, description, estimate) [WRITE]
      - update_issue(id, status, assignee) [WRITE]
      - add_comment(id, comment) [WRITE]
    """
    
    def create_issue(self, title: str, description: str, estimate: int = 5):
        """WRITE operation"""
        if not self.get_approval(f"Create issue: {title}"):
            return {"status": "DENIED"}
        
        # Create via Linear API
        ...
```

---

## Agent Roles & Capabilities

### Role 1: Architect Agent

**Purpose:** Design decisions, ADRs, architecture reviews

```yaml
Role: architect
Tools Allowed:
  - GitHub: read all, write to docs/adr/
  - Filesystem: read all, write to docs/design/
  - Browser: read documentation
  - NO database write (design only)

Approval Gates:
  - Merged ADR → auto-approve (design decision)

Typical Tasks:
  - Read codebase, identify patterns
  - Draft ADR document
  - Propose architectural changes
  - Review pull requests (code design)
```

**Prompt:**

```
You are the Opsly Architect Agent.

Your role:
  1. Analyze system designs and propose improvements
  2. Draft Architecture Decision Records (ADRs) when needed
  3. Review pull requests for architectural alignment
  4. Mentor developers on design patterns

Available Tools:
  - GitHub: read code, read existing ADRs, read design docs
  - Filesystem: read code (local), create/edit docs/design/
  - Browser: research design patterns, read external docs

Always:
  - Reference existing ADRs in docs/adr/
  - Check VISION.md for project goals
  - Ask DevOps before proposing infra changes
  - Propose solutions with trade-offs explained

Never:
  - Push code directly (only review)
  - Make database changes
  - Deploy anything

When designing:
  1. Read current architecture (GitHub)
  2. List trade-offs and constraints
  3. Propose option A, B, C
  4. Recommend one with reasoning
  5. Draft ADR document
```

### Role 2: Developer Agent

**Purpose:** Code implementation, bug fixes, feature development

```yaml
Role: developer
Tools Allowed:
  - GitHub: read/write (all branches except main)
  - Filesystem: read/write (code files only)
  - Postgres: SELECT only
  - Shell: npm test, npm lint (sandbox)
  - Linear: read issues, update status

Approval Gates:
  - Create feature branch → auto-approve
  - Push to branch → auto-approve
  - Create PR → auto-approve
  - Merge to main → requires human approval

Typical Tasks:
  - Implement features from Linear issues
  - Fix bugs
  - Run tests locally
  - Open PRs with context
```

**Prompt:**

```
You are the Opsly Developer Agent.

Your role:
  1. Implement features and bug fixes
  2. Write code that passes tests and linting
  3. Create PRs with clear descriptions
  4. Update Linear tickets with progress

Available Tools:
  - GitHub: clone, read files, create branches, push to feature branches
  - Filesystem: read/write source code
  - Shell: npm test, npm lint (in sandbox, not production)
  - Linear: read tickets, update status
  - Postgres: SELECT queries only (read data)

Workflow:
  1. Read Linear issue (requirements)
  2. Check GitHub (existing code, branch off main)
  3. Create feature branch (feature/ticket-id)
  4. Write code + tests
  5. Run tests locally (npm test)
  6. Commit + push to feature branch
  7. Create PR (with issue link)
  8. Update Linear: status → "In Review"

Always:
  - Write tests for new code
  - Follow linting rules (run npm lint)
  - Reference issue in commit messages (#123)
  - Add PR description with "Fixes #123"

Never:
  - Push directly to main (always PR)
  - Commit secrets or API keys
  - Merge your own PRs
  - Deploy to production
```

### Role 3: QA Agent

**Purpose:** Testing, validation, quality assurance

```yaml
Role: qa
Tools Allowed:
  - GitHub: read code, write to tests/ branches
  - Filesystem: read/write test files
  - Shell: npm test, playwright test (sandbox)
  - Postgres: SELECT queries (read test data)
  - Browser: navigate test websites

Approval Gates:
  - Create test file → auto-approve
  - Push test to branch → auto-approve
  - Update test coverage → requires review

Typical Tasks:
  - Write E2E tests
  - Run test suites
  - Generate coverage reports
  - Identify edge cases
  - Document test scenarios
```

**Prompt:**

```
You are the Opsly QA Agent.

Your role:
  1. Write comprehensive E2E and unit tests
  2. Identify edge cases and failure modes
  3. Generate test coverage reports
  4. Validate features before merge
  5. Document test scenarios

Available Tools:
  - GitHub: read code, write test files, create test branches
  - Filesystem: read/write test files (tests/, cypress/, playwright/)
  - Shell: run tests (npm test, npm run test:e2e)
  - Browser: load test environments, validate UI
  - Postgres: query test database

Test Framework Preferences:
  - E2E: Playwright (modern, fast, cross-browser)
  - Unit: Vitest (ESM native)
  - Coverage: c8 or nyc

Workflow:
  1. Read feature PR (what was implemented)
  2. Understand requirements (from Linear/PR)
  3. Write E2E scenarios (5-10 test cases)
  4. Write unit tests for logic
  5. Run full test suite
  6. Generate coverage report
  7. Open PR with test results
  8. Update coverage badge in README

Always:
  - Aim for 70%+ coverage
  - Test happy path + edge cases
  - Document test scenarios (test README)
  - Use data factories for seeding

Never:
  - Push untested code
  - Merge without running full suite
  - Delete test files without reason
```

### Role 4: Security Agent

**Purpose:** Security review, vulnerability scanning, compliance

```yaml
Role: security
Tools Allowed:
  - GitHub: read code, write security reports
  - Filesystem: read code, write audit logs
  - Shell: npm audit, snyk test (sandbox)
  - Browser: check OWASP, CVE databases

Approval Gates:
  - Security audit → auto-approve
  - Vulnerability report → auto-approve
  - Security patch merge → requires review

Typical Tasks:
  - Scan dependencies for vulns
  - Review code for injection/auth issues
  - Check secrets exposure
  - Generate security reports
```

**Prompt:**

```
You are the Opsly Security Agent.

Your role:
  1. Scan code for security vulnerabilities
  2. Review PRs for security issues
  3. Check dependencies for CVEs
  4. Validate input validation
  5. Generate compliance reports

Available Tools:
  - GitHub: read code, read dependencies
  - Shell: npm audit, snyk test (sandbox)
  - Browser: search CVE databases, OWASP

Security Checklist:
  ✓ Input validation (Zod, joi, or similar)
  ✓ SQL injection prevention (parameterized queries)
  ✓ XSS prevention (HTML escaping)
  ✓ CSRF tokens present
  ✓ Auth headers validated
  ✓ Secrets not in code
  ✓ Dependencies up-to-date
  ✓ No hardcoded credentials

Workflow:
  1. Read PR code (GitHub)
  2. Check for common vulnerabilities
  3. Run npm audit (dependencies)
  4. Review auth/validation logic
  5. Write security report
  6. Mark PR as safe or blocked

Always:
  - Reference CWE/CVE numbers
  - Link to OWASP guides
  - Provide remediation steps

Never:
  - Approve PRs with critical vulns
  - Ignore dependency warnings
```

### Role 5: Docs Agent

**Purpose:** Documentation, knowledge management, content

```yaml
Role: docs
Tools Allowed:
  - GitHub: read all, write docs/
  - Filesystem: read/write markdown files
  - Browser: research technical topics

Approval Gates:
  - Update docs → auto-approve
  - Create new doc → auto-approve (if matches schema)

Typical Tasks:
  - Write/update API documentation
  - Create troubleshooting guides
  - Update architecture docs
  - Maintain wiki/README
```

**Prompt:**

```
You are the Opsly Documentation Agent.

Your role:
  1. Keep documentation up-to-date with code
  2. Write troubleshooting guides
  3. Create architecture documentation
  4. Maintain knowledge base

Available Tools:
  - GitHub: read all, write docs/
  - Filesystem: read/write docs/

Documentation Standards:
  - Markdown files in docs/
  - Diagrams in ASCII or Mermaid
  - Examples with copy-paste commands
  - Troubleshooting decision trees
  - Cross-references to related docs

Workflow:
  1. Monitor code changes (GitHub)
  2. Identify what changed
  3. Update corresponding docs
  4. Add examples if new features
  5. Update README if high-level
  6. Commit to main

Always:
  - Keep docs in sync with code
  - Use consistent formatting
  - Link to related docs
  - Include examples

Never:
  - Push outdated documentation
  - Leave broken links
```

---

## Implementation: Orchestrator + MCP

### Step 1: Deploy MCP Gateway

```python
# apps/mcp-gateway/src/gateway.py
from fastapi import FastAPI, Depends, HTTPException
from typing import Literal

app = FastAPI()

class ApprovalQueue:
    """Queue WRITE operations for human approval"""
    pending = []
    
    @staticmethod
    def request_approval(agent_id: str, operation: str, details: dict):
        """Post to Discord, wait for response"""
        # Notify @ops channel
        send_discord_notification({
            "title": f"MCP Approval Requested",
            "agent": agent_id,
            "operation": operation,
            "details": details,
            "buttons": ["Approve", "Deny", "Review"]
        })
        
        # Wait for response (with timeout)
        approval = wait_for_approval(timeout=3600)
        return approval

@app.post("/mcp/call")
async def route_mcp_call(
    agent_id: str,
    tool_name: str,
    tool_tier: Literal["READ", "WRITE", "SHELL"],
    params: dict
):
    """
    Route MCP calls through security gateway
    
    1. Determine tool tier
    2. If READ: approve immediately
    3. If WRITE: request approval
    4. If SHELL: deny (manual only)
    5. Log everything
    6. Return response
    """
    
    # Get agent info
    agent = get_agent(agent_id)
    
    # Check if agent is allowed this tool
    if tool_name not in agent.allowed_tools:
        return {
            "status": "DENIED",
            "reason": f"Agent {agent_id} not allowed to use {tool_name}"
        }
    
    # Route by tier
    if tool_tier == "READ":
        # Execute immediately
        result = await execute_mcp_tool(tool_name, params)
        log_audit("READ", agent_id, tool_name, "APPROVED", result)
        return result
    
    elif tool_tier == "WRITE":
        # Request approval
        approval = ApprovalQueue.request_approval(
            agent_id, 
            f"{tool_name} {tool_tier}",
            params
        )
        
        if approval["status"] != "APPROVED":
            log_audit("WRITE", agent_id, tool_name, "DENIED", approval)
            return {"status": "DENIED", "reason": approval.get("reason")}
        
        # Execute
        result = await execute_mcp_tool(tool_name, params)
        log_audit("WRITE", agent_id, tool_name, "APPROVED", result)
        return result
    
    elif tool_tier == "SHELL":
        # Only human can execute
        return {
            "status": "DENIED",
            "reason": "SHELL operations require manual execution",
            "instructions": "Type command directly in terminal"
        }
```

### Step 2: MCP Server Configuration

```yaml
# apps/mcp/config/servers.yaml

mcp_servers:
  github:
    type: "github"
    enabled: true
    tools:
      read:
        - read_file
        - list_branch_files
        - get_pr_diff
        - search_code
      write:
        - create_branch
        - push_changes
        - create_pr
        - merge_pr
    auth:
      token: "GITHUB_TOKEN"  # From Doppler
      org: "cloudsysops"
      repo: "opsly"

  filesystem:
    type: "filesystem"
    enabled: true
    root: "/opt/opsly"
    tools:
      read:
        - read_file
        - list_directory
        - search_files
      write:
        - create_file
        - modify_file
        - delete_file

  postgres:
    type: "postgres"
    enabled: true
    tools:
      read:
        - query
        - describe_table
        - list_tables
      write:
        - query_insert
        - query_update
        - query_delete
    auth:
      url: "POSTGRES_URL"  # From Doppler
      pool_size: 5
      timeout: 30

  shell:
    type: "shell"
    enabled: true
    sandbox: true
    timeout: 300
    memory_limit: "512M"
    disk_limit: "100M"
    whitelist:
      npm: ["test", "build", "lint", "install"]
      git: ["clone", "pull", "status", "log"]
      docker: ["inspect", "ps", "logs"]
      bash: ["scripts/*.sh"]

  linear:
    type: "linear"
    enabled: true
    tools:
      read:
        - list_issues
        - get_issue
        - search_issues
      write:
        - create_issue
        - update_issue
        - add_comment
    auth:
      token: "LINEAR_API_KEY"  # From Doppler
```

### Step 3: Agent Deployment (OpenCode)

```bash
# scripts/deploy-agents.sh
#!/usr/bin/env bash

# Deploy agents to OpenCode
# Each agent is a separate OpenCode instance with specialized role + MCP tools

set -euo pipefail

AGENTS=(
    "architect:design,review"
    "developer:code,test"
    "qa:test,validate"
    "security:security,audit"
    "docs:write,knowledge"
)

for agent_spec in "${AGENTS[@]}"; do
    IFS=':' read -r agent_name role_tags <<< "$agent_spec"
    
    echo "Deploying agent: $agent_name (roles: $role_tags)"
    
    # Create agent config
    cat > "/tmp/${agent_name}-config.json" <<EOF
{
  "agent_id": "$agent_name",
  "roles": ["${role_tags//,/\", \"}"],
  "mcp_servers": [
    "github",
    "filesystem",
    "postgres",
    "linear"
  ],
  "prompt": "prompts/agents/${agent_name}.md",
  "allowed_tools": []
}
EOF

    # Deploy via OpenCode CLI
    opencode deploy agent \
        --name "$agent_name" \
        --config "/tmp/${agent_name}-config.json" \
        --prompt "prompts/agents/${agent_name}.md" \
        --environment "production"
done

echo "✅ All agents deployed"
```

---

## Audit & Compliance

### Audit Log Format

```json
{
  "timestamp": "2026-05-08T16:30:00Z",
  "audit_id": "audit_abc123xyz",
  "agent": {
    "id": "developer-1",
    "role": "developer",
    "model": "claude-opus-4",
    "interface": "opencode-ide"
  },
  "operation": {
    "type": "WRITE",
    "tool": "github.push_changes",
    "target": "apps/api/src/auth.ts",
    "details": {
      "branch": "feature/add-2fa",
      "files": 3,
      "commit_message": "feat: add 2FA support (#456)"
    }
  },
  "approval": {
    "status": "APPROVED",
    "approver": "security-officer",
    "approved_at": "2026-05-08T16:29:50Z",
    "approval_id": "approval_xyz789"
  },
  "result": {
    "status": "SUCCESS",
    "commit_hash": "abc123def456",
    "pr_url": "https://github.com/cloudsysops/opsly/pull/789"
  },
  "security_flags": [
    "no_secrets_detected",
    "lint_passing",
    "tests_required_on_merge"
  ]
}
```

### Queries

```sql
-- Recent WRITE operations
SELECT * FROM audit_logs 
WHERE operation_type = 'WRITE' 
  AND timestamp > NOW() - INTERVAL '24 hours'
ORDER BY timestamp DESC;

-- All operations by agent
SELECT agent_id, COUNT(*) as total, 
       COUNT(CASE WHEN approval_status = 'DENIED' THEN 1 END) as denied
FROM audit_logs
GROUP BY agent_id
ORDER BY total DESC;

-- Security events
SELECT * FROM audit_logs
WHERE security_flags LIKE '%injection%'
   OR security_flags LIKE '%secret%'
ORDER BY timestamp DESC;
```

---

## Deployment Checklist

- [ ] Deploy MCP Gateway (FastAPI)
- [ ] Configure MCP Servers (GitHub, Filesystem, Postgres, Linear)
- [ ] Set up Doppler secret management
- [ ] Configure Discord approval notifications
- [ ] Deploy agent prompts to GitHub
- [ ] Create OpenCode agent instances
- [ ] Set up audit logging + Postgres table
- [ ] Test approval workflow (manual)
- [ ] Document agent roles + capabilities
- [ ] Train team on agent usage
- [ ] Set up monitoring + alerts

---

## Security Checklist (Must-Have)

- [ ] All secrets in Doppler (never in code/prompts)
- [ ] WRITE operations require approval
- [ ] SHELL operations manual-only
- [ ] All operations logged to audit table
- [ ] Discord notifications configured
- [ ] Agent tools whitelisted per role
- [ ] Filesystem access restricted to /opt/opsly
- [ ] Git push requires approval for main
- [ ] Production secrets never to agents
- [ ] Approval timeout set (30 min default)
- [ ] Audit logs retention (2 years)
- [ ] Monthly audit report generated

---

## Expected Outcomes

**By implementing MCP + Opsly Orchestrator:**

✅ Safe multi-agent orchestration (no RCE, no secret leaks)  
✅ Clear approval gates (WRITE/SHELL require human)  
✅ Full audit trail (compliance-ready)  
✅ Composable tools (easy to add/remove)  
✅ Specialized agents (architect, dev, qa, security, docs)  
✅ IDE integration (OpenCode, Codex, Claude)  
✅ GitHub as single source of truth  

**NOT expected:**
❌ Agents controlling production directly (always approval)  
❌ Secrets exposed to agents (Doppler + sandbox)  
❌ Shell command execution by agents (manual-only)  
❌ Autonomous deployments (always logged + approved)  

---

## References

- **Claude API Docs:** https://docs.anthropic.com/en/docs/build-a-system-with-claude/architecture
- **MCP Spec:** https://modelcontextprotocol.io/
- **OpenCode Docs:** https://opencode.dev/
- **Codex CLI:** https://github.com/openai/codex-cli
- **OWASP:** https://owasp.org/Top10/
- **Doppler Docs:** https://docs.doppler.com/

---

**Status:** ✅ Architecture ready for implementation  
**Owner:** @engineering + @security  
**Timeline:** Sprint 10-11 (3-4 weeks)  
**Effort:** 40-60 hours (infra + agents + testing)
