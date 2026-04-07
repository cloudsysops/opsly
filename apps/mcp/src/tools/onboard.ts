import { z } from "zod";
import { opslyFetch } from "../lib/api-client.js";
import { publishEvent } from "../lib/events.js";
import type { ToolDefinition } from "../types/index.js";

interface OnboardInput {
  slug: string;
  email: string;
  plan: "startup" | "business" | "enterprise";
  send_invitation: boolean;
}

export const onboardTool: ToolDefinition<OnboardInput, Record<string, unknown>> = {
  name: "onboard_tenant",
  description:
    "Onboardea un nuevo cliente en Opsly. Crea tenant y opcionalmente envia invitacion.",
  inputSchema: z.object({
    slug: z
      .string()
      .min(3)
      .max(30)
      .regex(/^[a-z0-9-]+$/),
    email: z.string().email(),
    plan: z.enum(["startup", "business", "enterprise"]).default("startup"),
    send_invitation: z.boolean().default(true)
  }),
  handler: async (input: OnboardInput) => {
    const tenant = (await opslyFetch("/api/tenants", {
      method: "POST",
      body: JSON.stringify({
        slug: input.slug,
        owner_email: input.email,
        plan: input.plan
      })
    })) as { id?: string };

    if (input.send_invitation) {
      await opslyFetch("/api/invitations", {
        method: "POST",
        body: JSON.stringify({
          email: input.email,
          tenantRef: input.slug,
          mode: "developer"
        })
      });
    }

    await publishEvent("tenant.onboarded", {
      slug: input.slug,
      plan: input.plan,
      email: input.email,
      invitation_sent: input.send_invitation
    });

    return {
      success: true,
      tenant_id: tenant.id || null,
      slug: input.slug,
      n8n_url: `https://n8n-${input.slug}.ops.smiletripcare.com`,
      uptime_url: `https://uptime-${input.slug}.ops.smiletripcare.com`,
      invitation_sent: input.send_invitation
    };
  }
};
