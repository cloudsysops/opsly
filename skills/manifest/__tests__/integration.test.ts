import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { validateAllUserSkills } from "../src/load.js";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

describe("validateAllUserSkills (repo)", () => {
  it("skills/user valida sin errores", () => {
    const r = validateAllUserSkills(join(repoRoot, "skills", "user"));
    expect(r.errors).toEqual([]);
    expect(r.ok).toBe(true);
    expect(r.skills.length).toBeGreaterThanOrEqual(10);
  });
});
