import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "../route";

vi.mock("../../../../../lib/stripe", () => ({
  getStripe: vi.fn(),
}));

vi.mock("../../../../../lib/supabase", () => ({
  getServiceClient: vi.fn(),
}));

vi.mock("../../../../../lib/logger", () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

import { getStripe } from "../../../../../lib/stripe";
import { getServiceClient } from "../../../../../lib/supabase";

const mockStripeCreate = vi.fn();
const mockStripe = { checkout: { sessions: { create: mockStripeCreate } } };

function mockSlugFree() {
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
}

function mockSlugTaken() {
  (getServiceClient as ReturnType<typeof vi.fn>).mockReturnValue({
    schema: () => ({
      from: () => ({
        select: () => ({
          eq: () => ({
            is: () => ({
              maybeSingle: async () => ({
                data: { id: "existing-id" },
                error: null,
              }),
            }),
          }),
        }),
      }),
    }),
  });
}

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/checkout/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  (getStripe as ReturnType<typeof vi.fn>).mockReturnValue(mockStripe);
  process.env.STRIPE_PRICE_ID_STARTUP = "price_startup_test";
  process.env.STRIPE_PRICE_ID_BUSINESS = "price_business_test";
  process.env.STRIPE_PRICE_ID_ENTERPRISE = "price_enterprise_test";
});

describe("POST /api/checkout/session", () => {
  describe("validation", () => {
    it("returns 400 on invalid JSON", async () => {
      const req = new Request("http://localhost/api/checkout/session", {
        method: "POST",
        body: "not-json",
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it("returns 422 on invalid email", async () => {
      mockSlugFree();
      const res = await POST(makeRequest({ email: "bad", slug: "my-test", plan: "startup" }));
      expect(res.status).toBe(422);
      const json = await res.json();
      expect(json.details.email).toBeDefined();
    });

    it("returns 422 on invalid slug (uppercase)", async () => {
      mockSlugFree();
      const res = await POST(makeRequest({ email: "u@e.com", slug: "MySlug", plan: "startup" }));
      expect(res.status).toBe(422);
    });

    it("returns 422 on slug starting with hyphen", async () => {
      mockSlugFree();
      const res = await POST(makeRequest({ email: "u@e.com", slug: "-badslug", plan: "startup" }));
      expect(res.status).toBe(422);
    });

    it("returns 422 on invalid plan", async () => {
      mockSlugFree();
      const res = await POST(makeRequest({ email: "u@e.com", slug: "ok-slug", plan: "free" }));
      expect(res.status).toBe(422);
    });
  });

  describe("slug availability", () => {
    it("returns 409 when slug is already taken", async () => {
      mockSlugTaken();
      const res = await POST(makeRequest({ email: "u@e.com", slug: "taken", plan: "startup" }));
      expect(res.status).toBe(409);
      const json = await res.json();
      expect(json.error).toMatch(/en uso/);
    });
  });

  describe("stripe checkout session creation", () => {
    it("creates session and returns url for startup plan", async () => {
      mockSlugFree();
      mockStripeCreate.mockResolvedValue({ id: "cs_test_1", url: "https://checkout.stripe.com/pay/cs_test_1" });

      const res = await POST(makeRequest({ email: "user@company.com", slug: "my-company", plan: "startup" }));
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.url).toBe("https://checkout.stripe.com/pay/cs_test_1");

      expect(mockStripeCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: "subscription",
          customer_email: "user@company.com",
          line_items: [{ price: "price_startup_test", quantity: 1 }],
          metadata: { tenant_slug: "my-company", email: "user@company.com", plan: "startup" },
        }),
      );
    });

    it("creates session for business plan with correct price id", async () => {
      mockSlugFree();
      mockStripeCreate.mockResolvedValue({ id: "cs_test_2", url: "https://checkout.stripe.com/pay/cs_test_2" });

      const res = await POST(makeRequest({ email: "cto@corp.io", slug: "my-corp", plan: "business" }));
      expect(res.status).toBe(200);
      expect(mockStripeCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          line_items: [{ price: "price_business_test", quantity: 1 }],
        }),
      );
    });

    it("sets subscription_data metadata with tenant_slug and plan", async () => {
      mockSlugFree();
      mockStripeCreate.mockResolvedValue({ id: "cs_test_3", url: "https://checkout.stripe.com/pay/cs_test_3" });

      await POST(makeRequest({ email: "user@company.com", slug: "my-slug", plan: "enterprise" }));

      expect(mockStripeCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          subscription_data: {
            metadata: { tenant_slug: "my-slug", plan: "enterprise" },
          },
        }),
      );
    });

    it("returns 503 when price id is not configured", async () => {
      mockSlugFree();
      delete process.env.STRIPE_PRICE_ID_STARTUP;

      const res = await POST(makeRequest({ email: "u@e.com", slug: "ok-slug", plan: "startup" }));
      expect(res.status).toBe(503);
    });

    it("returns 500 when Stripe throws", async () => {
      mockSlugFree();
      mockStripeCreate.mockRejectedValue(new Error("Stripe network error"));

      const res = await POST(makeRequest({ email: "u@e.com", slug: "ok-slug", plan: "startup" }));
      expect(res.status).toBe(500);
    });
  });
});
