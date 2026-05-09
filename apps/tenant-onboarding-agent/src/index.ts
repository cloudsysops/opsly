import Fastify from 'fastify';
import { PrismaClient } from '@prisma/client';
import cron from 'node-cron';

const prisma = new PrismaClient();
const fastify = Fastify({ logger: true });

interface TenantOnboardingTask {
  tenant_id: string;
  step: 'setup' | 'configure' | 'validate' | 'activate';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  created_at: Date;
}

// Health check
fastify.get('/health', async (request, reply) => {
  return { status: 'OK', service: 'tenant-onboarding-agent', timestamp: new Date().toISOString() };
});

// Process pending invitations every 5 minutes
cron.schedule('*/5 * * * *', async () => {
  try {
    await processPendingInvitations();
  } catch (error) {
    console.error('Error processing pending invitations:', error);
  }
});

async function processPendingInvitations() {
  console.log('🔄 Processing pending invitations...');

  // Get accepted invitations that need onboarding
  const acceptedInvitations = await prisma.tenantInvitation.findMany({
    where: {
      status: 'accepted',
      accepted_at: {
        gte: new Date(Date.now() - 1 * 60 * 60 * 1000), // Last hour
      },
    },
  });

  for (const invitation of acceptedInvitations) {
    await onboardTenant(invitation.tenant_id, invitation.tenant_name, invitation.tenant_email);
  }
}

async function onboardTenant(tenant_id: string, tenant_name: string, contact_email: string) {
  console.log(`📋 Starting onboarding for ${tenant_name}...`);

  try {
    // Step 1: Setup (Developer Agent)
    await queueAgentTask({
      agent_id: 'developer',
      type: 'setup',
      description: `Setup Hermes environment for tenant ${tenant_id}`,
      context: {
        tenant_id,
        tenant_name,
        contact_email,
        step: 'setup',
      },
      priority: 'critical',
    });

    // Step 2: Configure (Architect Agent)
    await queueAgentTask({
      agent_id: 'architect',
      type: 'configure',
      description: `Configure Hermes agents and tools for ${tenant_name}`,
      context: {
        tenant_id,
        tenant_name,
        step: 'configure',
      },
      priority: 'high',
    });

    // Step 3: Validate (QA Agent)
    await queueAgentTask({
      agent_id: 'qa',
      type: 'validate',
      description: `Validate Hermes setup for tenant ${tenant_id}`,
      context: {
        tenant_id,
        tenant_name,
        step: 'validate',
      },
      priority: 'high',
    });

    // Step 4: Documentation (Docs Agent)
    await queueAgentTask({
      agent_id: 'docs',
      type: 'document',
      description: `Create onboarding documentation for ${tenant_name}`,
      context: {
        tenant_id,
        tenant_name,
        step: 'activate',
      },
      priority: 'medium',
    });

    console.log(`✅ Onboarding tasks queued for ${tenant_name}`);

    // Log onboarding start
    await prisma.auditLog.create({
      data: {
        agent_id: 'system',
        tool_name: 'tenant.onboard',
        tool_tier: 'WRITE',
        operation_type: 'TENANT_ONBOARDING_STARTED',
        status: 'SUCCESS',
        params: { tenant_id, tenant_name },
        context: `Started onboarding for ${tenant_name}`,
      },
    });
  } catch (error) {
    console.error(`Failed to onboard ${tenant_name}:`, error);

    await prisma.auditLog.create({
      data: {
        agent_id: 'system',
        tool_name: 'tenant.onboard',
        tool_tier: 'WRITE',
        operation_type: 'TENANT_ONBOARDING_FAILED',
        status: 'ERROR',
        error_message: (error as Error).message,
        params: { tenant_id, tenant_name },
      },
    });
  }
}

async function queueAgentTask(data: {
  agent_id: string;
  type: string;
  description: string;
  context: Record<string, unknown>;
  priority: string;
}) {
  try {
    const response = await fetch(`${process.env.AGENT_MANAGER_URL}/tasks/queue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agent_id: data.agent_id,
        type: data.type,
        description: data.description,
        priority: data.priority,
        context: data.context,
      }),
    });

    const result = await response.json();
    console.log(`✅ Task queued for ${data.agent_id}:`, result);

    return result;
  } catch (error) {
    console.error(`Failed to queue task for ${data.agent_id}:`, error);
    throw error;
  }
}

// Get onboarding status for tenant
fastify.get<{ Params: { tenant_id: string } }>(
  '/tenants/:tenant_id/onboarding-status',
  async (request, reply) => {
    const { tenant_id } = request.params;

    try {
      const logs = await prisma.auditLog.findMany({
        where: {
          params: {
            path: ['tenant_id'],
            equals: tenant_id,
          },
          operation_type: {
            in: ['TENANT_ONBOARDING_STARTED', 'TENANT_SETUP_COMPLETE', 'TENANT_VALIDATED'],
          },
        },
        orderBy: { timestamp: 'desc' },
      });

      return reply.send({
        tenant_id,
        total_steps: 4,
        completed_steps: logs.filter(l => l.status === 'SUCCESS').length,
        in_progress: logs.filter(l => l.status === 'PENDING').length,
        failed: logs.filter(l => l.status === 'ERROR').length,
        timeline: logs.map(l => ({
          timestamp: l.timestamp,
          step: l.operation_type,
          status: l.status,
        })),
      });
    } catch (error) {
      return reply.status(500).send({ error: (error as Error).message });
    }
  }
);

// Start server
fastify.listen({ port: 3004, host: '0.0.0.0' }, (err, address) => {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
  console.log(`✅ Tenant Onboarding Agent listening on ${address}`);
});
