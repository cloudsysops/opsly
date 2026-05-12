import Fastify, { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { EmbedBuilder, WebhookClient } from 'discord.js';
import crypto from 'crypto';

const prisma = new PrismaClient();

interface MCPCall {
  agent_id: string;
  tool_name: string;
  tool_tier: 'READ' | 'WRITE' | 'SHELL';
  params: Record<string, unknown>;
  context?: string;
}

interface ApprovalRequest {
  id: string;
  agent_id: string;
  tool_name: string;
  params: Record<string, unknown>;
  context?: string;
  status: 'PENDING' | 'APPROVED' | 'DENIED';
  approver?: string;
  created_at: Date;
  expires_at: Date;
  message_id?: string;
}

class MCPGateway {
  private fastify: FastifyInstance;
  private discord: WebhookClient | null = null;
  private pendingApprovals: Map<string, ApprovalRequest> = new Map();

  constructor() {
    this.fastify = Fastify({ logger: true });
    
    // Initialize Discord webhook if configured
    if (process.env.DISCORD_WEBHOOK_URL) {
      this.discord = new WebhookClient({ url: process.env.DISCORD_WEBHOOK_URL });
    }
  }

  async start() {
    // Health check
    this.fastify.get('/health', async (request, reply) => {
      return { status: 'OK', timestamp: new Date().toISOString() };
    });

    // Main MCP call endpoint
    this.fastify.post<{ Body: MCPCall }>('/mcp/call', async (request, reply) => {
      return this.routeMCPCall(request, reply);
    });

    // Approval endpoint (called by Discord webhook)
    this.fastify.post<{ Body: { approval_id: string; action: 'approve' | 'deny'; user: string } }>(
      '/approval/response',
      async (request, reply) => {
        return this.handleApprovalResponse(request, reply);
      }
    );

    // Audit logs endpoint
    this.fastify.get('/audit-logs', async (request, reply) => {
      const logs = await prisma.auditLog.findMany({
        orderBy: { timestamp: 'desc' },
        take: 100,
      });
      return reply.send(logs);
    });

    // Start listening
    await this.fastify.listen({ port: 3001, host: '0.0.0.0' });
    console.log('✅ MCP Gateway listening on :3001');
  }

  private async routeMCPCall(request: FastifyRequest<{ Body: MCPCall }>, reply: FastifyReply) {
    const { agent_id, tool_name, tool_tier, params, context } = request.body;

    try {
      // Get agent config
      const agent = await this.getAgentConfig(agent_id);
      if (!agent) {
        return reply.status(403).send({ error: `Agent ${agent_id} not found` });
      }

      // Check if agent is allowed this tool
      if (!agent.allowed_tools.includes(tool_name)) {
        await this.logAudit({
          agent_id,
          tool_name,
          tool_tier,
          operation_type: 'UNAUTHORIZED_TOOL',
          status: 'DENIED',
          reason: `Agent ${agent_id} not allowed to use ${tool_name}`,
        });
        return reply.status(403).send({ error: `Tool ${tool_name} not allowed for this agent` });
      }

      // Route by tier
      if (tool_tier === 'READ') {
        // READ tools are auto-approved
        const result = await this.executeTool(tool_name, params);
        await this.logAudit({
          agent_id,
          tool_name,
          tool_tier,
          operation_type: 'READ',
          status: 'SUCCESS',
          params,
          result,
          context,
        });
        return reply.send({ status: 'SUCCESS', data: result });
      }

      if (tool_tier === 'WRITE') {
        // WRITE tools require approval
        const approval = await this.requestApproval({
          agent_id,
          tool_name,
          params,
          context,
        });

        if (approval.status === 'APPROVED') {
          const result = await this.executeTool(tool_name, params);
          await this.logAudit({
            agent_id,
            tool_name,
            tool_tier,
            operation_type: 'WRITE',
            status: 'SUCCESS',
            params,
            result,
            approver: approval.approver,
            context,
          });
          return reply.send({ status: 'SUCCESS', data: result });
        } else if (approval.status === 'DENIED') {
          await this.logAudit({
            agent_id,
            tool_name,
            tool_tier,
            operation_type: 'WRITE',
            status: 'DENIED',
            approver: approval.approver,
            params,
            context,
          });
          return reply.status(403).send({ error: 'Operation denied by approver' });
        } else {
          // PENDING - still waiting
          return reply.status(202).send({
            status: 'PENDING',
            approval_id: approval.id,
            message: 'Waiting for approval',
          });
        }
      }

      if (tool_tier === 'SHELL') {
        // SHELL operations are manual-only
        await this.logAudit({
          agent_id,
          tool_name,
          tool_tier,
          operation_type: 'SHELL_BLOCKED',
          status: 'DENIED',
          params,
          reason: 'SHELL operations require manual execution',
        });
        return reply.status(403).send({
          error: 'SHELL operations not allowed for agents. Manual execution required.',
        });
      }
    } catch (error) {
      await this.logAudit({
        agent_id: request.body.agent_id,
        tool_name: request.body.tool_name,
        tool_tier: request.body.tool_tier,
        operation_type: 'ERROR',
        status: 'ERROR',
        error_message: (error as Error).message,
      });
      return reply.status(500).send({ error: (error as Error).message });
    }
  }

  private async requestApproval(data: {
    agent_id: string;
    tool_name: string;
    params: Record<string, unknown>;
    context?: string;
  }): Promise<ApprovalRequest> {
    const approval_id = `approval_${crypto.randomBytes(8).toString('hex')}`;
    const expires_at = new Date(Date.now() + 30 * 60 * 1000); // 30 min

    const approval: ApprovalRequest = {
      id: approval_id,
      agent_id: data.agent_id,
      tool_name: data.tool_name,
      params: data.params,
      context: data.context,
      status: 'PENDING',
      created_at: new Date(),
      expires_at,
    };

    this.pendingApprovals.set(approval_id, approval);

    // Send Discord notification
    if (this.discord) {
      try {
        const embed = new EmbedBuilder()
          .setColor(0xFFA500)
          .setTitle('🔔 MCP Approval Required')
          .addFields(
            { name: 'Agent', value: data.agent_id, inline: true },
            { name: 'Tool', value: data.tool_name, inline: true },
            { name: 'Approval ID', value: approval_id, inline: false },
            { name: 'Context', value: data.context || '(none)', inline: false },
            {
              name: 'Parameters',
              value: JSON.stringify(data.params).substring(0, 100) + '...',
              inline: false,
            }
          )
          .setTimestamp();

        await this.discord.send({
          embeds: [embed],
          content: `@here WRITE operation pending approval\n\`\`\`\nApprove: /approve ${approval_id}\nDeny: /deny ${approval_id}\n\`\`\``,
        });
      } catch (error) {
        console.error('Discord notification failed:', error);
      }
    }

    // Wait for approval (with timeout)
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        approval.status = 'DENIED';
        approval.expires_at = new Date();
        this.pendingApprovals.delete(approval_id);
        resolve(approval);
      }, 30 * 60 * 1000); // 30 min timeout

      // Store resolver for later
      (approval as any)._resolver = () => {
        clearTimeout(timeout);
        resolve(approval);
      };
    });
  }

  private async handleApprovalResponse(
    request: FastifyRequest<{ Body: { approval_id: string; action: 'approve' | 'deny'; user: string } }>,
    reply: FastifyReply
  ) {
    const { approval_id, action, user } = request.body;

    const approval = this.pendingApprovals.get(approval_id);
    if (!approval) {
      return reply.status(404).send({ error: 'Approval not found' });
    }

    approval.status = action === 'approve' ? 'APPROVED' : 'DENIED';
    approval.approver = user;

    // Resolve the pending promise
    if ((approval as any)._resolver) {
      (approval as any)._resolver();
    }

    this.pendingApprovals.delete(approval_id);

    return reply.send({ status: 'OK', approval_id, action });
  }

  private async executeTool(tool_name: string, params: Record<string, unknown>): Promise<any> {
    // Dispatch to appropriate tool handler
    const [server, method] = tool_name.split('.');

    switch (server) {
      case 'github':
        return this.executeGitHubTool(method, params);
      case 'filesystem':
        return this.executeFilesystemTool(method, params);
      case 'postgres':
        return this.executePostgresTool(method, params);
      default:
        throw new Error(`Unknown tool server: ${server}`);
    }
  }

  private async executeGitHubTool(method: string, params: Record<string, unknown>): Promise<any> {
    // Placeholder - implement actual GitHub API calls
    console.log(`Executing GitHub.${method}`, params);
    return { status: 'executed', tool: `github.${method}` };
  }

  private async executeFilesystemTool(method: string, params: Record<string, unknown>): Promise<any> {
    // Placeholder - implement actual filesystem operations
    console.log(`Executing Filesystem.${method}`, params);
    return { status: 'executed', tool: `filesystem.${method}` };
  }

  private async executePostgresTool(method: string, params: Record<string, unknown>): Promise<any> {
    // Placeholder - implement actual database queries
    console.log(`Executing Postgres.${method}`, params);
    return { status: 'executed', tool: `postgres.${method}` };
  }

  private async logAudit(data: {
    agent_id: string;
    tool_name: string;
    tool_tier: string;
    operation_type: string;
    status: string;
    params?: Record<string, unknown>;
    result?: any;
    error_message?: string;
    approver?: string;
    reason?: string;
    context?: string;
  }) {
    try {
      await prisma.auditLog.create({
        data: {
          agent_id: data.agent_id,
          tool_name: data.tool_name,
          tool_tier: data.tool_tier,
          operation_type: data.operation_type,
          status: data.status,
          params: data.params as any,
          result: data.result as any,
          error_message: data.error_message,
          approver: data.approver,
          reason: data.reason,
          context: data.context,
          timestamp: new Date(),
        },
      });
    } catch (error) {
      console.error('Failed to log audit:', error);
    }
  }

  private async getAgentConfig(agent_id: string): Promise<any> {
    // Get from database or config file
    // For now, return hardcoded config
    const agentConfigs: Record<string, any> = {
      architect: {
        id: 'architect',
        allowed_tools: ['github.read_file', 'github.list_files', 'filesystem.read_file'],
      },
      developer: {
        id: 'developer',
        allowed_tools: [
          'github.read_file',
          'github.write_file',
          'github.create_branch',
          'filesystem.read_file',
          'filesystem.write_file',
        ],
      },
      qa: {
        id: 'qa',
        allowed_tools: ['github.read_file', 'filesystem.read_file', 'filesystem.write_file'],
      },
      security: {
        id: 'security',
        allowed_tools: ['github.read_file', 'github.list_files'],
      },
      docs: {
        id: 'docs',
        allowed_tools: ['github.read_file', 'github.write_file', 'filesystem.read_file', 'filesystem.write_file'],
      },
    };

    return agentConfigs[agent_id];
  }
}

// Start gateway
const gateway = new MCPGateway();
gateway.start().catch(console.error);
