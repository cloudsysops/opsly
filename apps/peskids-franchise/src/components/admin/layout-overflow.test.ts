/**
 * Layout Overflow Prevention Tests
 *
 * Verifies that the admin layout flex chain has the required CSS classes
 * to prevent horizontal overflow when flex children (like ModuleEditor)
 * contain wide content (grids, inputs, URLs).
 *
 * The flex overflow bug: In a flex container, a child with flex-1 won't
 * shrink below its content's intrinsic width unless it has min-w-0.
 * Without it, long content (URLs, grid layouts) pushes the page wider
 * than the viewport.
 *
 * Required chain (every flex-1 ancestor needs min-w-0):
 *   AdminLayout outer flex → min-w-0
 *   AdminLayout <main>    → min-w-0 + overflow-x-hidden
 *   CurriculumTab panel   → min-w-0 + overflow-x-hidden
 *   ModuleEditor root     → min-w-0
 */

import { readFileSync } from "fs";
import { resolve } from "path";
import { describe, it, expect } from "vitest";

function readSource(relativePath: string): string {
  return readFileSync(resolve(__dirname, "../../..", relativePath), "utf-8");
}

describe("Admin layout overflow prevention", () => {
  it("admin layout outer flex has min-w-0", () => {
    const source = readSource("src/app/(admin)/layout.tsx");
    // The flex-1 flex container wrapping sidebar + main
    expect(source).toMatch(/className="flex-1 flex min-w-0"/);
  });

  it("admin layout <main> has min-w-0 and overflow-x-hidden", () => {
    const source = readSource("src/app/(admin)/layout.tsx");
    const mainMatch = source.match(/className="([^"]*)"[^>]*>\s*\{children\}/);
    expect(mainMatch).toBeTruthy();
    const mainClasses = mainMatch![1];
    expect(mainClasses).toContain("min-w-0");
    expect(mainClasses).toContain("overflow-x-hidden");
  });

  it("CurriculumTab editor panel has min-w-0 and overflow-x-hidden", () => {
    const source = readSource(
      "src/components/admin/programs/CurriculumTab.tsx"
    );
    // The left panel (editor area) flex child
    expect(source).toContain("flex-1 min-w-0 overflow-y-auto overflow-x-hidden");
  });

  it("ModuleEditor root has min-w-0", () => {
    const source = readSource(
      "src/components/admin/curriculum-editor/ModuleEditor.tsx"
    );
    // The root div of ModuleEditor's return
    expect(source).toContain('className="min-w-0 max-w-full"');
  });

  it("program detail page wrapper has min-w-0", () => {
    const source = readSource(
      "src/app/(admin)/admin/learning/programs/[id]/page.tsx"
    );
    expect(source).toContain('className="space-y-4 min-w-0"');
  });
});
