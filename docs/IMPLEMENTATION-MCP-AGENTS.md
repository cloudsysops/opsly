---
status: implementation-guide
owner: engineering + devops
date: 2026-05-08T16:30:00Z
version: 1.0
---

# Implementation Guide: MCP + Multi-Agent Orchestration for Opsly

**Step-by-step guide to deploy Opsly Orchestrator + 5 specialized agents with MCP.**

---

## Overview

```
Goal: By end of this guide, you'll have:
  ✅ MCP Gateway running (routes tool calls, manages approvals)
  ✅ 5 MCP Servers configured (GitHub, Filesystem, Postgres, Linear, Shell)
  ✅ 5 Agent instances in OpenCode (architect, developer, qa, security, docs)
  ✅ Approval workflow via Discord
  ✅ Audit logging of all operations
  ✅ Security gates (READ/WRITE/SHELL isolation)

Timeline: 2-3 days (1 person)
```

---

## Phase 1: Infrastructure Setup (4-6 hours)

### Step 1.1: Create MCP Gateway Service

```bash
# In repo root
mkdir -p apps/mcp-gateway/src
cd apps/mcp-gateway

# Copy Dockerfile from existing service
cp ../api/Dockerfile .

# Create gateway code
cat > src/gateway.ts << 'EOF'
import Fastify from 'fastify';
import { ApprovalQueue } from './approval-queue';
import { AuditLogger } from './audit-logger';
import { SecureToolRouter } from './tool-router';

const fastify = Fastify({ logger: true });

// Initialize components
const approvalQueue = new ApprovalQueue();
const auditLogger = new AuditLogger();
const toolRouter = new SecureToolRouter();

// Main endpoint: Route MCP calls through security gateway
fastify.post<{
  Body: {
    agent_id: string;
    tool_name: string;
    tool_tier: 'READ' | 'WRITE' | 'SHELL';
    params: Record<string, unknown>;
  };
}>('/mcp/call', async (request, reply) => {
  const { agent_id, tool_name, tool_tier, params } = request.body;

  try {
    // Get agent info
    const agent = await getAgentConfig(agent_id);
    
    // Check if agent is allowed this tool
    if (!agent.allowed_tools.includes(tool_name)) {
      return reply.status(403).send({
        status: 'DENIED',
        reason: `Agent ${agent_id} not allowed to use ${tool_name}`
      });
    }

    // Route based on tool tier
    if (tool_tier === 'READ') {
      // Execute immediately (READ-only is safe)
      const result = await toolRouter.execute(tool_name, params);
      
      // Log to audit trail
      await auditLogger.log({
        timestamp: new Date(),
        agent_id,
        operation_type: 'READ',
        tool_name,
        params,
        result: { status: 'SUCCESS' },
        approval_status: 'AUTO_APPROVED'
      });
      
      return reply.send({ status: 'SUCCESS', data: result });
    } 
    
    else if (tool_tier === 'WRITE') {
      // Request human approval
      const approval = await approvalQueue.request({
        agent_id,
        tool_name,
        params,
        description: `${tool_name} with params: ${JSON.stringify(params).substring(0, 100)}...`
      });

      if (approval.status !== 'APPROVED') {
        await auditLogger.log({
          timestamp: new Date(),
          agent_id,
          operation_type: 'WRITE',
          tool_name,
          params,
          approval_status: 'DENIED',
          approver: approval.approver,
          reason: approval.reason
        });
        
        return reply.status(403).send({
          status: 'DENIED',
          reason: approval.reason,
          approval_id: approval.approval_id
        });
      }

      // Execute approved operation
      const result = await toolRouter.execute(tool_name, params);
      
      // Log successful operation
      await auditLogger.log({
        timestamp: new Date(),
        agent_id,
        operation_type: 'WRITE',
        tool_name,
        params,
        result: { status: 'SUCCESS', ...result },
        approval_status: 'APPROVED',
        approver: approval.approver,
        approval_id: approval.approval_id
      });
      
      return reply.send({ status: 'SUCCESS', data: result });
    } 
    
    else if (tool_tier === 'SHELL') {
      // Block shell execution (manual only)
      return reply.status(403).send({
        status: 'DENIED',
        reason: 'SHELL operations require manual execution',
        instructions: 'Type command directly in terminal, agent can observe output'
      });
    }
  } catch (error) {
    // Log error
    await auditLogger.log({
      timestamp: new Date(),
      agent_id,
      operation_type: tool_tier,
      tool_name,
      params,
      error: (error as Error).message,
      approval_status: 'ERROR'
    });

    return reply.status(500).send({
      status: 'ERROR',
      message: (error as Error).message
    });
  }
});

// Health check
fastify.get('/health', async (request, reply) => {
  return reply.send({ status: 'OK' });
});

// Start server
const start = async () => {
  try {
    await fastify.listen({ port: 3001, host: '0.0.0.0' });
    console.log('MCP Gateway running on :3001');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
EOF
```

### Step 1.2: Database Schema for Audit Logs

```sql
-- In Supabase migrations
-- File: supabase/migrations/XXX_create_audit_logs.sql

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  agent_id TEXT NOT NULL,
  operation_type TEXT NOT NULL, -- READ, WRITE, SHELL
  tool_name TEXT NOT NULL,
  params JSONB,
  result JSONB,
  approval_status TEXT, -- AUTO_APPROVED, APPROVED, DENIED
  approver TEXT,
  approval_id TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_agent_id ON audit_logs(agent_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX idx_audit_logs_operation_type ON audit_logs(operation_type);

-- Insert audit log entries
INSERT INTO audit_logs (
  agent_id, 
  operation_type, 
  tool_name, 
  params, 
  result, 
  approval_status
) VALUES (
  'developer-1',
  'WRITE',
  'github.push_changes',
  '{"branch": "feature/456", "files": 3}',
  '{"commit_hash": "abc123"}',
  'APPROVED'
);

-- Query audit logs
SELECT * FROM audit_logs 
WHERE timestamp > NOW() - INTERVAL '24 hours'
ORDER BY timestamp DESC
LIMIT 50;
```

### Step 1.3: Approval Queue Service

```typescript
// apps/mcp-gateway/src/approval-queue.ts

import { Client: DiscordClient } from 'discord.js';

export class ApprovalQueue {
  private discord: DiscordClient;
  private pendingApprovals: Map<string, PendingApproval> = new Map();
  
  constructor() {
    this.discord = new DiscordClient({ intents: ['Guilds', 'DirectMessages'] });
  }

  async request(data: {
    agent_id: string;
    tool_name: string;
    params: Record<string, unknown>;
    description: string;
  }): Promise<{
    status: 'APPROVED' | 'DENIED';
    approver: string;
    approval_id: string;
    reason?: string;
  }> {
    const approval_id = `approval_${Date.now()}`;
    
    // Send Discord notification
    const channel = await this.discord.channels.fetch(process.env.DISCORD_CHANNEL_ID!);
    if (!channel?.isTextBased()) throw new Error('Invalid Discord channel');
    
    const message = await channel.send({
      content: `<@&${process.env.DISCORD_ROLE_ID}> **MCP Approval Requested**`,
      embeds: [{
        title: `${data.agent_id} → ${data.tool_name}`,
        description: data.description,
        fields: [
          { name: 'Agent', value: data.agent_id, inline: true },
          { name: 'Tool', value: data.tool_name, inline: true },
          { name: 'Approval ID', value: approval_id, inline: false }
        ],
        color: 0xFFA500 // Orange
      }],
      components: [{
        type: 1,
        components: [
          {
            type: 2,
            style: 3, // Green
            label: 'Approve',
            custom_id: `approve_${approval_id}`
          },
          {
            type: 2,
            style: 4, // Red
            label: 'Deny',
            custom_id: `deny_${approval_id}`
          },
          {
            type: 2,
            style: 2, // Blue
            label: 'Review Changes',
            custom_id: `review_${approval_id}`
          }
        ]
      }]
    });

    // Create promise that resolves when approved/denied
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingApprovals.delete(approval_id);
        reject(new Error('Approval request timed out (30 min)'));
      }, 30 * 60 * 1000);

      this.pendingApprovals.set(approval_id, {
        data,
        resolve: (approval) => {
          clearTimeout(timeout);
          this.pendingApprovals.delete(approval_id);
          resolve(approval);
        },
        reject
      });
    });
  }

  // Called by Discord interaction handler
  async handleApprovalResponse(approval_id: string, action: 'approve' | 'deny', user: string) {
    const pending = this.pendingApprovals.get(approval_id);
    if (!pending) return;

    if (action === 'approve') {
      pending.resolve({
        status: 'APPROVED',
        approver: user,
        approval_id
      });
    } else {
      pending.resolve({
        status: 'DENIED',
        approver: user,
        approval_id,
        reason: 'User denied approval'
      });
    }
  }
}

interface PendingApproval {
  data: any;
  resolve: (approval: any) => void;
  reject: (error: Error) => void;
}
```

### Step 1.4: Deploy MCP Gateway

```bash
# Build Docker image
docker build -t opsly/mcp-gateway:latest apps/mcp-gateway/

# Add to docker-compose.yml
cat >> infra/docker-compose.yml << 'EOF'

  opsly_mcp_gateway:
    image: opsly/mcp-gateway:latest
    container_name: opsly_mcp_gateway
    environment:
      NODE_ENV: production
      PORT: 3001
      DATABASE_URL: ${DATABASE_URL}
      DISCORD_WEBHOOK_URL: ${DISCORD_WEBHOOK_URL}
      DISCORD_CHANNEL_ID: ${DISCORD_CHANNEL_ID}
      DISCORD_ROLE_ID: ${DISCORD_ROLE_ID}
      DOPPLER_TOKEN: ${DOPPLER_TOKEN}
    ports:
      - "3001:3001"
    depends_on:
      - infra-app-1
    networks:
      - opsly
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3
EOF

# Deploy
docker-compose up -d opsly_mcp_gateway
docker-compose logs -f opsly_mcp_gateway
```

---

## Phase 2: MCP Servers Configuration (4-6 hours)

### Step 2.1: GitHub MCP Server

```typescript
// apps/mcp/servers/github-mcp.ts

import { Octokit } from '@octokit/rest';

export class GitHubMCPServer {
  private github: Octokit;
  private repo_owner: string;
  private repo_name: string;

  constructor(token: string, owner: string, repo: string) {
    this.github = new Octokit({ auth: token });
    this.repo_owner = owner;
    this.repo_name = repo;
  }

  // READ tools (no approval needed)
  async read_file(path: string, branch: string = 'main'): Promise<string> {
    const response = await this.github.repos.getContent({
      owner: this.repo_owner,
      repo: this.repo_name,
      path,
      ref: branch
    });

    if (Array.isArray(response.data)) {
      throw new Error('Path is a directory');
    }

    return Buffer.from(response.data.content, 'base64').toString();
  }

  async list_branch_files(branch: string = 'main'): Promise<string[]> {
    const response = await this.github.repos.getContent({
      owner: this.repo_owner,
      repo: this.repo_name,
      path: '.',
      ref: branch
    });

    if (!Array.isArray(response.data)) {
      throw new Error('Invalid response');
    }

    return response.data.map(f => f.path);
  }

  async search_code(query: string, language?: string): Promise<any[]> {
    const search_query = language ? `${query} language:${language}` : query;
    const response = await this.github.search.code({
      q: `repo:${this.repo_owner}/${this.repo_name} ${search_query}`,
      per_page: 20
    });

    return response.data.items;
  }

  // WRITE tools (require approval)
  async create_branch(branch_name: string, from_branch: string = 'main'): Promise<any> {
    // Get reference from source branch
    const sourceRef = await this.github.git.getRef({
      owner: this.repo_owner,
      repo: this.repo_name,
      ref: `heads/${from_branch}`
    });

    // Create new branch
    const newRef = await this.github.git.createRef({
      owner: this.repo_owner,
      repo: this.repo_name,
      ref: `refs/heads/${branch_name}`,
      sha: sourceRef.data.object.sha
    });

    return { branch: branch_name, sha: newRef.data.object.sha };
  }

  async push_changes(
    branch: string,
    changes: { path: string; content: string }[],
    message: string
  ): Promise<any> {
    // Get current branch head
    const ref = await this.github.git.getRef({
      owner: this.repo_owner,
      repo: this.repo_name,
      ref: `heads/${branch}`
    });

    let treeSha = ref.data.object.sha;

    // Create tree with changes
    const tree_items = await Promise.all(
      changes.map(async (change) => ({
        path: change.path,
        mode: '100644' as const,
        type: 'blob' as const,
        content: change.content
      }))
    );

    const tree = await this.github.git.createTree({
      owner: this.repo_owner,
      repo: this.repo_name,
      tree: tree_items,
      base_tree: treeSha
    });

    // Create commit
    const commit = await this.github.git.createCommit({
      owner: this.repo_owner,
      repo: this.repo_name,
      message,
      tree: tree.data.sha,
      parents: [treeSha]
    });

    // Update reference
    const updated = await this.github.git.updateRef({
      owner: this.repo_owner,
      repo: this.repo_name,
      ref: `heads/${branch}`,
      sha: commit.data.sha
    });

    return {
      commit_hash: commit.data.sha,
      message,
      files_changed: changes.length
    };
  }

  async create_pr(
    branch: string,
    base: string,
    title: string,
    description?: string
  ): Promise<any> {
    const pr = await this.github.pulls.create({
      owner: this.repo_owner,
      repo: this.repo_name,
      head: branch,
      base,
      title,
      body: description || ''
    });

    return {
      pr_number: pr.data.number,
      pr_url: pr.data.html_url,
      id: pr.data.id
    };
  }
}
```

### Step 2.2: Filesystem MCP Server

```typescript
// apps/mcp/servers/filesystem-mcp.ts

import fs from 'fs/promises';
import path from 'path';

const ALLOWED_ROOT = '/opt/opsly';

export class FilesystemMCPServer {
  private validatePath(filePath: string): string {
    const normalized = path.normalize(path.join(ALLOWED_ROOT, filePath));
    
    // Prevent directory traversal
    if (!normalized.startsWith(ALLOWED_ROOT)) {
      throw new Error(`Access denied: path outside allowed directory`);
    }
    
    return normalized;
  }

  // READ tools
  async read_file(filePath: string): Promise<string> {
    const validPath = this.validatePath(filePath);
    return await fs.readFile(validPath, 'utf-8');
  }

  async list_directory(dirPath: string = '.'): Promise<string[]> {
    const validPath = this.validatePath(dirPath);
    const entries = await fs.readdir(validPath, { withFileTypes: true });
    
    return entries.map(entry => 
      entry.isDirectory() ? `${entry.name}/` : entry.name
    );
  }

  async search_files(pattern: string): Promise<string[]> {
    // Simple glob-like search (for complex patterns, use glob library)
    const results: string[] = [];
    
    const search = async (dir: string) => {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.name.includes(pattern)) {
          results.push(path.relative(ALLOWED_ROOT, fullPath));
        }
        
        if (entry.isDirectory() && !entry.name.startsWith('.')) {
          await search(fullPath);
        }
      }
    };

    await search(ALLOWED_ROOT);
    return results;
  }

  // WRITE tools
  async create_file(filePath: string, content: string): Promise<any> {
    const validPath = this.validatePath(filePath);
    
    // Create parent directories if needed
    const dir = path.dirname(validPath);
    await fs.mkdir(dir, { recursive: true });
    
    await fs.writeFile(validPath, content, 'utf-8');
    
    return {
      path: filePath,
      size: content.length,
      status: 'created'
    };
  }

  async modify_file(filePath: string, old_text: string, new_text: string): Promise<any> {
    const validPath = this.validatePath(filePath);
    
    let content = await fs.readFile(validPath, 'utf-8');
    
    if (!content.includes(old_text)) {
      throw new Error(`Text to replace not found in file`);
    }
    
    content = content.replace(old_text, new_text);
    await fs.writeFile(validPath, content, 'utf-8');
    
    return {
      path: filePath,
      status: 'modified',
      replacements: 1
    };
  }
}
```

### Step 2.3: Shell MCP Server (Sandboxed)

```typescript
// apps/mcp/servers/shell-mcp.ts

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const WHITELIST = {
  npm: ['test', 'build', 'lint', 'install', 'run'],
  git: ['clone', 'pull', 'status', 'log', 'diff'],
  docker: ['inspect', 'ps', 'logs', 'images'],
  bash: ['scripts/*.sh']
};

export class ShellMCPServer {
  private isWhitelisted(cmd: string): boolean {
    const parts = cmd.trim().split(/\s+/);
    const [program, subcommand, ...args] = parts;

    const allowed = WHITELIST[program as keyof typeof WHITELIST];
    if (!allowed) return false;

    // Check if subcommand is allowed
    return allowed.some(a => 
      a === subcommand || a === '*' || a.startsWith(subcommand)
    );
  }

  async execute_command(
    cmd: string,
    options: { timeout?: number; dry_run?: boolean } = {}
  ): Promise<any> {
    if (!this.isWhitelisted(cmd)) {
      throw new Error(`Command not whitelisted: ${cmd}`);
    }

    const timeout = options.timeout || 300000; // 5 min default

    try {
      const { stdout, stderr } = await execAsync(cmd, {
        timeout,
        cwd: '/opt/opsly',
        maxBuffer: 1024 * 1024 // 1 MB
      });

      return {
        status: 'SUCCESS',
        stdout,
        stderr,
        exit_code: 0
      };
    } catch (error: any) {
      return {
        status: 'ERROR',
        stdout: error.stdout || '',
        stderr: error.stderr || '',
        exit_code: error.code || 1
      };
    }
  }

  async test_command(test_cmd: string): Promise<any> {
    // Run tests in sandbox
    return this.execute_command(test_cmd, { timeout: 600000 }); // 10 min for tests
  }
}
```

---

## Phase 3: Agent Deployment (6-8 hours)

### Step 3.1: Export Agent Prompts

```bash
# Create agent prompt files
mkdir -p prompts/agents

# Copy from docs/AGENT-PROMPTS-REFERENCE.md to individual files
# Each role gets its own prompt file

cat > prompts/agents/architect.md << 'PROMPT'
[Architect system prompt from AGENT-PROMPTS-REFERENCE.md]
PROMPT

cat > prompts/agents/developer.md << 'PROMPT'
[Developer system prompt from AGENT-PROMPTS-REFERENCE.md]
PROMPT

# ... repeat for qa.md, security.md, docs.md
```

### Step 3.2: Create Agent Config Files

```json
// config/agents/architect.json
{
  "id": "architect",
  "name": "Architect Agent",
  "role": "architect",
  "model": "claude-3-5-sonnet-20241022",
  "mcp_servers": [
    "github",
    "filesystem",
    "browser"
  ],
  "allowed_tools": [
    "github.read_file",
    "github.list_branch_files",
    "github.search_code",
    "github.get_pr_diff",
    "filesystem.read_file",
    "filesystem.list_directory",
    "browser.fetch_url"
  ],
  "prompt_file": "prompts/agents/architect.md",
  "auto_approve_operations": [
    "github.create_branch"
  ],
  "requires_approval": [],
  "blocked_operations": [
    "shell.*",
    "postgres.query_insert",
    "postgres.query_update"
  ]
}
```

### Step 3.3: Deploy to OpenCode

```bash
#!/bin/bash
# scripts/deploy-agents.sh

set -euo pipefail

AGENTS=(
  "architect"
  "developer"
  "qa"
  "security"
  "docs"
)

for agent in "${AGENTS[@]}"; do
  echo "Deploying $agent agent..."
  
  # Create OpenCode instance
  opencode create agent \
    --name "$agent" \
    --config "config/agents/$agent.json" \
    --prompt "prompts/agents/$agent.md" \
    --mcp-gateway "http://localhost:3001"
  
  # Verify deployment
  opencode verify agent "$agent"
  
  echo "✅ $agent deployed"
done

echo "✅ All agents deployed successfully"
```

---

## Phase 4: Testing & Validation (4-6 hours)

### Step 4.1: Test Approval Workflow

```bash
# 1. Trigger a WRITE operation from developer agent
# 2. Check Discord for approval notification
# 3. Click "Approve"
# 4. Verify operation completed + logged to audit table
# 5. Test "Deny" flow (operation should be blocked)
# 6. Test "Review Changes" (show what would happen)
```

### Step 4.2: Test Audit Logging

```sql
-- Verify audit logs are being created
SELECT COUNT(*) FROM audit_logs WHERE agent_id = 'developer';

-- Check recent operations
SELECT timestamp, agent_id, tool_name, approval_status 
FROM audit_logs 
ORDER BY timestamp DESC 
LIMIT 10;

-- Check for any errors
SELECT * FROM audit_logs 
WHERE error_message IS NOT NULL 
ORDER BY timestamp DESC;
```

### Step 4.3: Test Each Agent Role

```
✓ Architect agent: Can read code, draft ADRs
✓ Developer agent: Can create branches, write code, run tests
✓ QA agent: Can write tests, run Playwright
✓ Security agent: Can scan code, run npm audit
✓ Docs agent: Can update documentation

Each test:
1. Invoke @agent_name [task]
2. Verify correct tools used
3. Verify no tool tier violations
4. Verify output quality
```

---

## Phase 5: Monitoring & Maintenance (2-4 hours)

### Step 5.1: Set Up Dashboards

```sql
-- Audit log dashboard queries

-- Operations by agent
SELECT agent_id, operation_type, COUNT(*) as count
FROM audit_logs
WHERE timestamp > NOW() - INTERVAL '7 days'
GROUP BY agent_id, operation_type
ORDER BY count DESC;

-- Approval success rate
SELECT 
  approval_status,
  COUNT(*) as total,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) as percentage
FROM audit_logs
WHERE operation_type IN ('WRITE', 'SHELL')
  AND timestamp > NOW() - INTERVAL '30 days'
GROUP BY approval_status;

-- Failed operations
SELECT timestamp, agent_id, tool_name, error_message
FROM audit_logs
WHERE error_message IS NOT NULL
ORDER BY timestamp DESC;
```

### Step 5.2: Monitoring & Alerts

```yaml
# Set up Datadog/New Relic alerting

alerts:
  - name: "High DENY rate"
    condition: "approval_deny_rate > 20% in last 1 hour"
    action: "Notify @ops on Discord"
  
  - name: "MCP Gateway errors"
    condition: "error_rate > 5% in last 5 min"
    action: "Auto-restart gateway, notify team"
  
  - name: "Audit log growth"
    condition: "audit_log_table_size > 1GB"
    action: "Archive old logs, notify @devops"
```

---

## Phase 6: Rollout to Team (2-3 hours)

### Step 6.1: Create Documentation

```markdown
# Agent Quick Start

## Invoking Agents

In OpenCode IDE:

```
@architect design database schema for multi-tenancy
@developer implement feature #456
@qa write E2E tests for auth flow
@security audit PR #789
@docs update API documentation
```

## Approval Workflow

1. Agent requests WRITE operation
2. Notification posted to #ops-approvals Discord
3. Ops team clicks "Approve" or "Deny"
4. Operation completes or fails
5. Audit log created automatically
```

### Step 6.2: Train Team

```
Session 1: Architecture overview (30 min)
  - Why MCP + agents
  - Security model (READ/WRITE/SHELL)
  - Approval workflow

Session 2: Using agents (1 hour)
  - How to invoke each agent
  - Example workflows
  - Troubleshooting

Session 3: Hands-on (1-2 hours)
  - Each team member uses agents
  - Practice approval workflow
  - Test edge cases
```

---

## Troubleshooting

### MCP Gateway won't start

```bash
# Check logs
docker logs opsly_mcp_gateway

# Verify environment variables
docker exec opsly_mcp_gateway env | grep DISCORD

# Test endpoint
curl http://localhost:3001/health
```

### Agent not responding

```bash
# Check OpenCode process
opencode list agents
opencode status architect

# Restart agent
opencode restart architect

# Check logs
opencode logs architect
```

### Approval not showing in Discord

```bash
# Verify Discord credentials
echo $DISCORD_WEBHOOK_URL
echo $DISCORD_CHANNEL_ID

# Test Discord connection
curl -X POST $DISCORD_WEBHOOK_URL \
  -d '{"content": "Test message"}'
```

---

## Rollback Plan

If issues arise:

```bash
# Stop agents (they'll pause, not delete)
docker-compose down opsly_mcp_gateway

# Revert to previous version
git revert <commit-hash>
docker-compose up -d opsly_mcp_gateway

# Audit trail is preserved in database
SELECT * FROM audit_logs ORDER BY timestamp DESC;
```

---

## Success Criteria

✅ MCP Gateway running, health check passing  
✅ 5 agents deployed to OpenCode  
✅ Approval workflow working via Discord  
✅ All operations logged to audit table  
✅ Team can invoke agents from IDE  
✅ No secrets exposed in logs  
✅ Zero security violations  

---

**Status:** ✅ Implementation guide ready  
**Effort:** ~20-30 hours total  
**Timeline:** 2-3 days with 1 engineer  
**Support:** @engineering + @devops
