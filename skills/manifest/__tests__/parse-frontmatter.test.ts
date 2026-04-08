import { describe, expect, it } from "vitest";
import { parseSimpleFrontmatter } from "../src/parse-frontmatter.js";

describe("parseSimpleFrontmatter", () => {
  it("sin bloque devuelve cuerpo completo", () => {
    const r = parseSimpleFrontmatter("# H\n");
    expect(r.frontmatter).toEqual({});
    expect(r.body).toBe("# H\n");
  });

  it("parsea claves simples", () => {
    const md = `---
name: my-skill
version: "1.2.0"
---
# Body
`;
    const r = parseSimpleFrontmatter(md);
    expect(r.frontmatter).toEqual({ name: "my-skill", version: "1.2.0" });
    expect(r.body.trim()).toBe("# Body");
  });
});
