function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

type PlanDefinition = {
  name: string;
  price_usd: number;
  stripe_price_id: string;
  services: string[];
  port_range: readonly [number, number];
  max_workflows: number;
  support: string;
};

export const PLANS = {
  startup: {
    name: "Startup",
    price_usd: 49,
    stripe_price_id: requireEnv("STRIPE_PRICE_ID_STARTUP"),
    services: ["n8n", "uptime_kuma"],
    port_range: [8000, 9999] as const,
    max_workflows: 10,
    support: "email",
  },
  business: {
    name: "Business",
    price_usd: 149,
    stripe_price_id: requireEnv("STRIPE_PRICE_ID_BUSINESS"),
    services: ["n8n", "uptime_kuma"],
    port_range: [10000, 13999] as const,
    max_workflows: 50,
    support: "priority_email",
  },
  enterprise: {
    name: "Enterprise",
    price_usd: 499,
    stripe_price_id: requireEnv("STRIPE_PRICE_ID_ENTERPRISE"),
    services: ["n8n", "uptime_kuma"],
    port_range: [14000, 17999] as const,
    max_workflows: 500,
    support: "dedicated_slack",
  },
  demo: {
    name: "Demo",
    price_usd: 0,
    stripe_price_id: requireEnv("STRIPE_PRICE_ID_DEMO"),
    services: ["n8n", "uptime_kuma"],
    port_range: [18000, 19999] as const,
    max_workflows: 3,
    support: "community",
  },
} as const satisfies Record<
  "startup" | "business" | "enterprise" | "demo",
  PlanDefinition
>;

export type PlanKey = keyof typeof PLANS;
