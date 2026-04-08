import { describe, expect, it } from "vitest";
import {
  applyRoutingBias,
  parseLlmGatewayRoutingHeaders,
  parseLlmGatewayRoutingParams,
} from "../src/routing-hints.js";

describe("applyRoutingBias", () => {
  it("balanced leaves preference unchanged", () => {
    expect(applyRoutingBias("sonnet", 3, "balanced")).toBe("sonnet");
    expect(applyRoutingBias("cheap", 1, "balanced")).toBe("cheap");
  });

  it("cost downgrades sonnet to haiku at level 3", () => {
    expect(applyRoutingBias("sonnet", 3, "cost")).toBe("haiku");
  });

  it("cost downgrades haiku to cheap at level 2", () => {
    expect(applyRoutingBias("haiku", 2, "cost")).toBe("cheap");
  });

  it("quality upgrades cheap to haiku at level 1", () => {
    expect(applyRoutingBias("cheap", 1, "quality")).toBe("haiku");
  });

  it("quality upgrades haiku to sonnet at level 2", () => {
    expect(applyRoutingBias("haiku", 2, "quality")).toBe("sonnet");
  });
});

describe("parseLlmGatewayRoutingParams", () => {
  it("reads llm_model and llm_routing", () => {
    const sp = new URLSearchParams("llm_model=haiku&llm_routing=cost");
    expect(parseLlmGatewayRoutingParams(sp)).toEqual({
      model: "haiku",
      routing_bias: "cost",
    });
  });

  it("accepts aliases model and routing_bias", () => {
    const sp = new URLSearchParams("model=sonnet&routing_bias=quality");
    expect(parseLlmGatewayRoutingParams(sp)).toEqual({
      model: "sonnet",
      routing_bias: "quality",
    });
  });

  it("ignores invalid routing value", () => {
    const sp = new URLSearchParams("llm_routing=fast");
    expect(parseLlmGatewayRoutingParams(sp)).toEqual({});
  });
});

describe("parseLlmGatewayRoutingHeaders", () => {
  it("reads x-llm-model and x-llm-routing", () => {
    const h = new Headers();
    h.set("x-llm-model", "cheap");
    h.set("x-llm-routing", "balanced");
    expect(parseLlmGatewayRoutingHeaders(h)).toEqual({
      model: "cheap",
      routing_bias: "balanced",
    });
  });
});
