import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "../route";

vi.mock("../../../../../lib/stripe", () => ({
  constructWebhookEvent: vi.fn(),
}));

vi.mock("../../../../../lib/orchestrator", () => ({
  provisionTenant: vi.fn(),
  suspendTenant: vi.fn(),
}));

vi.mock("../../../../../lib/notifications", () => ({
  notifyInvoicePaymentFailed: vi.fn(),
  notifyStripeWebhookCritical: vi.fn(),
}));

vi.mock("../../../../../lib/supabase", () => ({
  getServiceClient: vi.fn(),
}));

vi.mock("../../../../../lib/logger", () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

import {
    notifyInvoicePaymentFailed,
    notifyStripeWebhookCritical,
} from "../../../../../lib/notifications";
import {
    provisionTenant,
    suspendTenant,
} from "../../../../../lib/orchestrator";
import { constructWebhookEvent } from "../../../../../lib/stripe";
import { getServiceClient } from "../../../../../lib/supabase";

function makeRequest(body: string, signature = "t=1,v1=abc") {
  return new Request("http://localhost/api/webhooks/stripe", {
    method: "POST",
    headers: {
      "stripe-signature": signature,
      "Content-Type": "application/json",
    },
    body,
  });
}

function makeSubscriptionInsertChain() {
  const insertFn = vi.fn().mockResolvedValue({ error: null });
  const updateFn = vi.fn().mockResolvedValue({ error: null });
  return (getServiceClient as ReturnType<typeof vi.fn>).mockReturnValue({
    schema: () => ({
      from: (table: string) => {
        if (table === "tenants") {
          return {
            select: () => ({
              eq: () => ({
                is: () => ({
                  maybeSingle: async () => ({
                    data: { id: "t1", slug: "acme" },
                    error: null,
                  }),
                }),
              }),
            }),
            update: () => ({ eq: updateFn }),
          };
        }
        if (table === "subscriptions") {
          return { insert: insertFn };
        }
        return {};
      },
    }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NODE_ENV = "test";
  process.env.STRIPE_TEST_SECRET_KEY = "sk_test_route_dummy";
  process.env.STRIPE_WEBHOOK_SECRET_TEST = "whsec_test";
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
});

describe("POST /api/webhooks/stripe", () => {
  describe("signature verification", () => {
    it("returns 500 when ningún webhook secret está configurado (no-prod)", async () => {
      delete process.env.STRIPE_WEBHOOK_SECRET;
      delete process.env.STRIPE_WEBHOOK_SECRET_TEST;
      const res = await POST(
        makeRequest(JSON.stringify({ type: "checkout.session.completed" })),
      );
      expect(res.status).toBe(500);
      expect(constructWebhookEvent).not.toHaveBeenCalled();
      expect(provisionTenant).not.toHaveBeenCalled();
    });

    it("returns 400 when signature verification fails", async () => {
      (constructWebhookEvent as ReturnType<typeof vi.fn>).mockReturnValue(null);
      const res = await POST(makeRequest("raw-body"));
      expect(res.status).toBe(400);
      expect(provisionTenant).not.toHaveBeenCalled();
    });
  });

  describe("checkout.session.completed", () => {
    it("calls provisionTenant with correct args when metadata is complete", async () => {
      const mockEvent = {
        type: "checkout.session.completed",
        data: {
          object: {
            metadata: {
              tenant_slug: "acme",
              email: "ceo@acme.com",
              plan: "startup",
            },
            customer: "cus_123",
          },
        },
      };
      (constructWebhookEvent as ReturnType<typeof vi.fn>).mockReturnValue(
        mockEvent,
      );
      (provisionTenant as ReturnType<typeof vi.fn>).mockResolvedValue(
        undefined,
      );

      const res = await POST(makeRequest(JSON.stringify(mockEvent)));
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.received).toBe(true);

      expect(provisionTenant).toHaveBeenCalledWith({
        slug: "acme",
        owner_email: "ceo@acme.com",
        plan: "startup",
        stripe_customer_id: "cus_123",
      });
    });

    it("does NOT call provisionTenant when slug is missing in metadata", async () => {
      const mockEvent = {
        type: "checkout.session.completed",
        data: {
          object: {
            metadata: { email: "ceo@acme.com", plan: "startup" },
            customer: "cus_123",
          },
        },
      };
      (constructWebhookEvent as ReturnType<typeof vi.fn>).mockReturnValue(
        mockEvent,
      );

      const res = await POST(makeRequest(JSON.stringify(mockEvent)));
      expect(res.status).toBe(200);
      expect(provisionTenant).not.toHaveBeenCalled();
    });

    it("does NOT call provisionTenant when plan is invalid", async () => {
      const mockEvent = {
        type: "checkout.session.completed",
        data: {
          object: {
            metadata: {
              tenant_slug: "acme",
              email: "ceo@acme.com",
              plan: "invalid_plan",
            },
            customer: "cus_123",
          },
        },
      };
      (constructWebhookEvent as ReturnType<typeof vi.fn>).mockReturnValue(
        mockEvent,
      );

      const res = await POST(makeRequest(JSON.stringify(mockEvent)));
      expect(res.status).toBe(200);
      expect(provisionTenant).not.toHaveBeenCalled();
    });

    it("returns 500 if provisionTenant throws (Stripe reintenta)", async () => {
      const mockEvent = {
        type: "checkout.session.completed",
        data: {
          object: {
            metadata: {
              tenant_slug: "acme",
              email: "ceo@acme.com",
              plan: "business",
            },
            customer: null,
          },
        },
      };
      (constructWebhookEvent as ReturnType<typeof vi.fn>).mockReturnValue(
        mockEvent,
      );
      (provisionTenant as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("VPS unreachable"),
      );

      const res = await POST(makeRequest(JSON.stringify(mockEvent)));
      expect(res.status).toBe(500);
      expect(notifyStripeWebhookCritical).toHaveBeenCalled();
    });
  });

  describe("invoice.payment_failed", () => {
    it("calls suspendTenant and notifyInvoicePaymentFailed", async () => {
      makeSubscriptionInsertChain();
      const mockEvent = {
        type: "invoice.payment_failed",
        data: {
          object: { customer: "cus_456", id: "in_789" },
        },
      };
      (constructWebhookEvent as ReturnType<typeof vi.fn>).mockReturnValue(
        mockEvent,
      );
      (suspendTenant as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (
        notifyInvoicePaymentFailed as ReturnType<typeof vi.fn>
      ).mockResolvedValue(undefined);

      const res = await POST(makeRequest(JSON.stringify(mockEvent)));
      expect(res.status).toBe(200);
      expect(suspendTenant).toHaveBeenCalledWith("t1", "stripe-webhook");
      expect(notifyInvoicePaymentFailed).toHaveBeenCalledWith("acme", "in_789");
    });

    it("returns 200 even when customer not found in DB", async () => {
      (getServiceClient as ReturnType<typeof vi.fn>).mockReturnValue({
        schema: () => ({
          from: () => ({
            select: () => ({
              eq: () => ({
                is: () => ({
                  maybeSingle: async () => ({ data: null, error: null }),
                }),
              }),
            }),
          }),
        }),
      });
      const mockEvent = {
        type: "invoice.payment_failed",
        data: { object: { customer: "cus_unknown", id: "in_000" } },
      };
      (constructWebhookEvent as ReturnType<typeof vi.fn>).mockReturnValue(
        mockEvent,
      );

      const res = await POST(makeRequest(JSON.stringify(mockEvent)));
      expect(res.status).toBe(200);
      expect(suspendTenant).not.toHaveBeenCalled();
    });
  });

  describe("unknown event types", () => {
    it("ignores unknown event types and returns 200", async () => {
      const mockEvent = {
        type: "payment_intent.created",
        data: { object: {} },
      };
      (constructWebhookEvent as ReturnType<typeof vi.fn>).mockReturnValue(
        mockEvent,
      );

      const res = await POST(makeRequest(JSON.stringify(mockEvent)));
      expect(res.status).toBe(200);
      expect(provisionTenant).not.toHaveBeenCalled();
      expect(suspendTenant).not.toHaveBeenCalled();
    });
  });
});
