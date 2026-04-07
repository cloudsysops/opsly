import { describe, expect, it } from "vitest";
import { estimateCost, MODEL_CONFIG, selectModel } from "../src/router.js";

describe("router", () => {
  it("selectModel usa preferencia por defecto", () => {
    expect(selectModel().id).toBe(MODEL_CONFIG.sonnet.id);
  });

  it("selectModel usa fallback haiku", () => {
    expect(selectModel("sonnet", true).id).toBe(MODEL_CONFIG.haiku.id);
  });

  it("estimateCost calcula costos", () => {
    const cost = estimateCost(MODEL_CONFIG.haiku, 1000, 500);
    expect(cost).toBeGreaterThan(0);
    expect(cost).toBeLessThan(0.01);
  });
});
