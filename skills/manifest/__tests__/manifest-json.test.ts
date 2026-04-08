import { describe, expect, it } from "vitest";
import { parseManifestJsonObject } from "../src/manifest-json.js";

describe("parseManifestJsonObject", () => {
  it("requiere name", () => {
    expect(() => parseManifestJsonObject({})).toThrow(/name/);
  });

  it("acepta esquemas", () => {
    const m = parseManifestJsonObject({
      name: "x",
      version: "1.0.0",
      inputSchema: { type: "object" },
      outputSchema: { type: "object" },
    });
    expect(m.name).toBe("x");
    expect(m.inputSchema).toEqual({ type: "object" });
  });
});
