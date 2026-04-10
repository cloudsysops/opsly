/* @vitest-environment jsdom */
import "@testing-library/jest-dom/vitest";

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createClient } from "@/lib/supabase/client";
import useSWR from "swr";
import MissionControlPage from "./page";

vi.mock("@/lib/api", () => ({
  getApiBaseUrl: () => "https://api.opsly.test",
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(),
}));

vi.mock("swr", () => ({
  default: vi.fn(),
}));

describe("Mission Control auth regression", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows Unauthorized and does not fetch infra status without session", () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValue(new Error("should-not-fetch"));

    vi.mocked(createClient).mockReturnValue({
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: { session: null },
          error: null,
        }),
      },
    } as never);

    vi.mocked(useSWR).mockImplementation((key) => {
      if (key === "mission-control-access-token") {
        return {
          data: undefined,
          error: new Error("Unauthorized"),
          isLoading: false,
          mutate: vi.fn(),
        } as never;
      }
      return {
        data: undefined,
        error: undefined,
        isLoading: false,
        mutate: vi.fn(),
      } as never;
    });

    render(<MissionControlPage />);

    expect(screen.getByText(/Unauthorized/i)).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("renders API and Orchestrator cards with valid session", () => {
    vi.mocked(createClient).mockReturnValue({
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: { session: { access_token: "valid-token" } },
          error: null,
        }),
      },
    } as never);

    vi.mocked(useSWR).mockImplementation((key) => {
      if (key === "mission-control-access-token") {
        return {
          data: "valid-token",
          error: undefined,
          isLoading: false,
          mutate: vi.fn(),
        } as never;
      }
      return {
        data: {
          generated_at: new Date().toISOString(),
          services: [
            {
              name: "api",
              status: "healthy",
              lastSeenSeconds: 3,
              ttlSeconds: 57,
              metadata: {},
            },
            {
              name: "orchestrator",
              status: "healthy",
              lastSeenSeconds: 8,
              ttlSeconds: 52,
              metadata: { uptime: "120" },
            },
          ],
        },
        error: undefined,
        isLoading: false,
        mutate: vi.fn(),
      } as never;
    });

    render(<MissionControlPage />);

    expect(screen.getByText("api")).toBeInTheDocument();
    expect(screen.getByText("orchestrator")).toBeInTheDocument();
  });
});
