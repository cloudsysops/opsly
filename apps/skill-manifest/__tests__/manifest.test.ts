import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  loadSkillPackage,
  mergeManifests,
  parseManifestJsonFile,
  parseSkillMarkdown,
  validateAllUserSkills,
} from "../src/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoSkillsContext = join(__dirname, "../../../skills/user/opsly-context");

describe("parseSkillMarkdown", () => {
  it("returns full body when no frontmatter", () => {
    const r = parseSkillMarkdown("# Hello\n\nworld");
    expect(r.manifest).toEqual({});
    expect(r.body).toBe("# Hello\n\nworld");
  });

  it("parses JSON frontmatter", () => {
    const raw = `---
{"version":"2.0.0","name":"test-skill"}
---
# Body here
`;
    const r = parseSkillMarkdown(raw);
    expect(r.manifest).toEqual({ version: "2.0.0", name: "test-skill" });
    expect(r.body.trim()).toBe("# Body here");
    expect(r.frontmatterFormat).toBe("json");
  });

  it("parses YAML simple frontmatter cuando no es JSON", () => {
    const raw = `---
name: yaml-skill
version: "0.1.0"
description: test
---
# Doc
`;
    const r = parseSkillMarkdown(raw);
    expect(r.manifest.name).toBe("yaml-skill");
    expect(r.manifest.version).toBe("0.1.0");
    expect(r.body.trim()).toBe("# Doc");
    expect(r.frontmatterFormat).toBe("yaml");
  });

  it("on invalid JSON frontmatter returns empty manifest and full text as body", () => {
    const raw = `---
not json
---
# X
`;
    const r = parseSkillMarkdown(raw);
    expect(r.manifest).toEqual({});
    expect(r.body).toBe(raw);
  });
});

describe("mergeManifests", () => {
  it("override wins", () => {
    expect(mergeManifests({ version: "1", name: "a" }, { version: "2" })).toEqual({
      version: "2",
      name: "a",
    });
  });
});

describe("parseManifestJsonFile", () => {
  it("parses manifest.json shape", () => {
    const m = parseManifestJsonFile(`{"name":"x","version":"1.0.0"}`);
    expect(m).toEqual({ name: "x", version: "1.0.0" });
  });
});

describe("loadSkillPackage (integration)", () => {
  it("loads opsly-context with manifest.json", async () => {
    const p = await loadSkillPackage(repoSkillsContext);
    expect(p.manifest.name).toBe("opsly-context");
    expect(p.manifest.version).toBe("1.0.0");
    expect(p.manifest.inputSchema).toBeDefined();
    expect(p.manifestSources).toContain("manifest.json");
    expect(p.body).toContain("Opsly Context Skill");
  });
});

describe("validateAllUserSkills", () => {
  it("lista todos los skills bajo skills/user sin errores", async () => {
    const root = join(__dirname, "../../../skills/user");
    const r = await validateAllUserSkills(root);
    expect(r.ok).toBe(true);
    expect(r.errors).toEqual([]);
    expect(r.skills.length).toBeGreaterThanOrEqual(10);
  });
});
