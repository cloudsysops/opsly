import Fastify from 'fastify';
import { PrismaClient } from '@prisma/client';
import { sendInvitationEmail } from './email-service';
import crypto from 'crypto';

const prisma = new PrismaClient();
const fastify = Fastify({ logger: true });

interface TenantInvitation {
  id: string;
  tenant_id: string;
  tenant_name: string;
  tenant_email: string;
  invitation_token: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: Date;
  expires_at: Date;
  accepted_at?: Date;
}

interface TenantOnboarding {
  tenant_slug: string;
  tenant_name: string;
  contact_email: string;
  contact_name: string;
  plan: 'starter' | 'pro' | 'enterprise';
  features: string[];
  billing_contact_email: string;
}

// Health check
fastify.get('/health', async (request, reply) => {
  return { status: 'OK', service: 'tenant-invitations', timestamp: new Date().toISOString() };
});

// Create tenant invitation
fastify.post<{ Body: TenantOnboarding }>(
  '/tenants/invite',
  async (request, reply) => {
    const { tenant_slug, tenant_name, contact_email, contact_name, plan, features, billing_contact_email } =
      request.body;

    try {
      // Generate invitation token
      const invitation_token = crypto.randomBytes(32).toString('hex');
      const expires_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      // Create invitation
      const invitation = await prisma.tenantInvitation.create({
        data: {
          tenant_id: tenant_slug,
          tenant_name,
          tenant_email: contact_email,
          invitation_token,
          status: 'pending',
          expires_at,
        },
      });

      // Send invitation email
      await sendInvitationEmail({
        to: contact_email,
        tenant_name,
        contact_name,
        invitation_token,
        acceptance_url: `${process.env.PORTAL_URL}/onboarding/accept/${invitation_token}`,
        expires_at,
      });

      // Log to audit
      await prisma.auditLog.create({
        data: {
          agent_id: 'system',
          tool_name: 'tenant.invite',
          tool_tier: 'WRITE',
          operation_type: 'TENANT_INVITED',
          status: 'SUCCESS',
          params: { tenant_slug, contact_email, plan },
          context: `Invited tenant ${tenant_name}`,
        },
      });

      return reply.send({
        status: 'INVITED',
        tenant_id: tenant_slug,
        invitation_id: invitation.id,
        invitation_token,
        expires_at,
        message: `Invitation sent to ${contact_email}`,
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: (error as Error).message });
    }
  }
);

// Accept tenant invitation
fastify.post<{ Params: { token: string } }>(
  '/tenants/accept/:token',
  async (request, reply) => {
    const { token } = request.params;

    try {
      // Find invitation
      const invitation = await prisma.tenantInvitation.findUnique({
        where: { invitation_token: token },
      });

      if (!invitation) {
        return reply.status(404).send({ error: 'Invitation not found' });
      }

      if (invitation.status !== 'pending') {
        return reply.status(400).send({ error: `Invitation already ${invitation.status}` });
      }

      if (new Date() > invitation.expires_at) {
        return reply.status(400).send({ error: 'Invitation expired' });
      }

      // Update invitation
      await prisma.tenantInvitation.update({
        where: { id: invitation.id },
        data: {
          status: 'accepted',
          accepted_at: new Date(),
        },
      });

      // Queue onboarding tasks
      const onboardingTasks = [
        {
          agent_id: 'developer',
          type: 'setup',
          description: `Setup Hermes environment for tenant ${invitation.tenant_id}`,
          priority: 'critical',
        },
        {
          agent_id: 'qa',
          type: 'validate',
          description: `Validate tenant ${invitation.tenant_id} onboarding`,
          priority: 'high',
        },
        {
          agent_id: 'docs',
          type: 'document',
          description: `Create onboarding docs for tenant ${invitation.tenant_id}`,
          priority: 'high',
        },
      ];

      for (const task of onboardingTasks) {
        await fetch(`${process.env.AGENT_MANAGER_URL}/tasks/queue`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(task),
        });
      }

      // Log acceptance
      await prisma.auditLog.create({
        data: {
          agent_id: 'system',
          tool_name: 'tenant.accept',
          tool_tier: 'WRITE',
          operation_type: 'TENANT_ACCEPTED',
          status: 'SUCCESS',
          params: { tenant_id: invitation.tenant_id },
          context: `Tenant ${invitation.tenant_id} accepted invitation`,
        },
      });

      return reply.send({
        status: 'ACCEPTED',
        tenant_id: invitation.tenant_id,
        message: 'Onboarding tasks queued for agents',
        next_steps: 'Check your dashboard for setup progress',
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: (error as Error).message });
    }
  }
);

// List pending invitations
fastify.get('/invitations/pending', async (request, reply) => {
  const invitations = await prisma.tenantInvitation.findMany({
    where: { status: 'pending' },
    orderBy: { created_at: 'desc' },
  });

  return reply.send({
    count: invitations.length,
    invitations: invitations.map(inv => ({
      tenant_id: inv.tenant_id,
      tenant_name: inv.tenant_name,
      created_at: inv.created_at,
      expires_at: inv.expires_at,
      days_until_expiry: Math.ceil((inv.expires_at.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
    })),
  });
});

// Get invitation status
fastify.get<{ Params: { token: string } }>(
  '/invitations/status/:token',
  async (request, reply) => {
    const { token } = request.params;

    const invitation = await prisma.tenantInvitation.findUnique({
      where: { invitation_token: token },
    });

    if (!invitation) {
      return reply.status(404).send({ error: 'Invitation not found' });
    }

    return reply.send({
      tenant_id: invitation.tenant_id,
      tenant_name: invitation.tenant_name,
      status: invitation.status,
      created_at: invitation.created_at,
      expires_at: invitation.expires_at,
      is_expired: new Date() > invitation.expires_at,
    });
  }
);

// Start server
fastify.listen({ port: 3003, host: '0.0.0.0' }, (err, address) => {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
  console.log(`✅ Tenant Invitations service listening on ${address}`);
});
