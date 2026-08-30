import { describe, it, expect } from "vitest";
import {
  cn,
  formatDate,
  formatDateTime,
  formatCurrency,
  slugify,
  getInitials,
} from "@/lib/utils";

// ---------------------------------------------------------------------------
// cn - Tailwind class merger (clsx + twMerge)
// ---------------------------------------------------------------------------
describe("cn", () => {
  it("merges multiple class strings", () => {
    expect(cn("px-4", "py-2")).toBe("px-4 py-2");
  });

  it("resolves conflicting Tailwind classes (last wins)", () => {
    expect(cn("px-4", "px-6")).toBe("px-6");
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
    expect(cn("bg-white", "bg-black")).toBe("bg-black");
  });

  it("handles conditional classes via object syntax", () => {
    expect(cn("base", { "text-bold": true, "text-italic": false })).toBe(
      "base text-bold"
    );
  });

  it("handles conditional classes via logical expressions", () => {
    const isActive = true;
    const isDisabled = false;
    expect(cn("btn", isActive && "btn-active", isDisabled && "btn-disabled")).toBe(
      "btn btn-active"
    );
  });

  it("handles array inputs", () => {
    expect(cn(["px-2", "py-2"])).toBe("px-2 py-2");
  });

  it("filters out falsy values (undefined, null, false)", () => {
    expect(cn("a", undefined, null, false, "b")).toBe("a b");
  });

  it("returns empty string when no inputs", () => {
    expect(cn()).toBe("");
  });

  it("deduplicates identical classes", () => {
    expect(cn("p-4", "p-4")).toBe("p-4");
  });

  it("merges conflicting margin/padding variants correctly", () => {
    expect(cn("mt-2", "mt-4")).toBe("mt-4");
    expect(cn("p-2 px-4", "px-6")).toBe("p-2 px-6");
  });
});

// ---------------------------------------------------------------------------
// formatDate - formats to "Jan 1, 2024" style
// ---------------------------------------------------------------------------
describe("formatDate", () => {
  it("formats a Date object", () => {
    // Use UTC midnight to avoid timezone shifts changing the date
    const date = new Date("2024-01-15T00:00:00");
    const result = formatDate(date);
    expect(result).toBe("Jan 15, 2024");
  });

  it("formats an ISO string", () => {
    const result = formatDate("2024-06-01T12:00:00Z");
    // The exact day may vary by local timezone but month and year should be stable
    expect(result).toMatch(/Jun \d{1,2}, 2024/);
  });

  it("formats a date-only string", () => {
    // Date-only strings are parsed as UTC in some environments
    const result = formatDate("2023-12-25T00:00:00");
    expect(result).toBe("Dec 25, 2023");
  });

  it("handles end-of-year date", () => {
    const result = formatDate(new Date("2024-12-31T12:00:00"));
    expect(result).toBe("Dec 31, 2024");
  });

  it("handles start-of-year date", () => {
    const result = formatDate(new Date("2024-01-01T12:00:00"));
    expect(result).toBe("Jan 1, 2024");
  });

  it("handles leap year date", () => {
    const result = formatDate(new Date("2024-02-29T12:00:00"));
    expect(result).toBe("Feb 29, 2024");
  });
});

// ---------------------------------------------------------------------------
// formatDateTime - formats to "Jan 1, 2024, 1:00 PM" style
// ---------------------------------------------------------------------------
describe("formatDateTime", () => {
  it("formats a Date object with time", () => {
    const date = new Date("2024-01-15T13:00:00");
    const result = formatDateTime(date);
    // Should contain month, day, year, and time
    expect(result).toContain("Jan");
    expect(result).toContain("15");
    expect(result).toContain("2024");
    expect(result).toMatch(/1:00\s?PM/);
  });

  it("formats midnight correctly", () => {
    const date = new Date("2024-06-01T00:00:00");
    const result = formatDateTime(date);
    expect(result).toContain("Jun");
    expect(result).toMatch(/12:00\s?AM/);
  });

  it("formats noon correctly", () => {
    const date = new Date("2024-06-01T12:00:00");
    const result = formatDateTime(date);
    expect(result).toContain("Jun");
    expect(result).toMatch(/12:00\s?PM/);
  });

  it("formats an ISO string", () => {
    const result = formatDateTime("2024-03-15T09:30:00");
    expect(result).toContain("2024");
    expect(result).toMatch(/9:30\s?AM/);
  });

  it("includes minutes with leading zero", () => {
    const date = new Date("2024-01-01T14:05:00");
    const result = formatDateTime(date);
    expect(result).toMatch(/2:05\s?PM/);
  });
});

// ---------------------------------------------------------------------------
// formatCurrency - formats to "$1,234" (no cents)
// ---------------------------------------------------------------------------
describe("formatCurrency", () => {
  it("formats a positive integer", () => {
    expect(formatCurrency(1234)).toBe("$1,234");
  });

  it("formats zero", () => {
    expect(formatCurrency(0)).toBe("$0");
  });

  it("formats a negative number", () => {
    expect(formatCurrency(-500)).toBe("-$500");
  });

  it("formats a large number with commas", () => {
    expect(formatCurrency(1000000)).toBe("$1,000,000");
  });

  it("rounds decimals (no cents displayed)", () => {
    expect(formatCurrency(99.99)).toBe("$100");
    expect(formatCurrency(99.49)).toBe("$99");
  });

  it("formats a small decimal", () => {
    expect(formatCurrency(0.5)).toBe("$1");
    expect(formatCurrency(0.4)).toBe("$0");
  });

  it("formats negative decimals", () => {
    expect(formatCurrency(-1234.56)).toBe("-$1,235");
  });

  it("formats very large numbers", () => {
    expect(formatCurrency(999999999)).toBe("$999,999,999");
  });
});

// ---------------------------------------------------------------------------
// slugify - converts to URL slug
// ---------------------------------------------------------------------------
describe("slugify", () => {
  it("converts simple text to lowercase slug", () => {
    expect(slugify("Hello World")).toBe("hello-world");
  });

  it("replaces multiple spaces with single dash", () => {
    expect(slugify("hello   world")).toBe("hello-world");
  });

  it("removes special characters", () => {
    expect(slugify("Hello, World! How's it going?")).toBe(
      "hello-world-hows-it-going"
    );
  });

  it("handles existing dashes", () => {
    expect(slugify("already-slugified")).toBe("already-slugified");
  });

  it("collapses multiple dashes", () => {
    expect(slugify("hello---world")).toBe("hello-world");
  });

  it("trims leading and trailing dashes", () => {
    expect(slugify("-hello world-")).toBe("hello-world");
  });

  it("replaces underscores with dashes", () => {
    expect(slugify("hello_world_test")).toBe("hello-world-test");
  });

  it("handles empty string", () => {
    expect(slugify("")).toBe("");
  });

  it("removes unicode/non-ASCII characters", () => {
    // The regex [^\w\s-] removes non-word chars; \w does NOT match most unicode
    expect(slugify("caf\u00e9 latt\u00e9")).toBe("caf-latt");
  });

  it("handles mixed spaces, underscores, and dashes", () => {
    expect(slugify("hello - world _ test")).toBe("hello-world-test");
  });

  it("handles string with only special characters", () => {
    expect(slugify("!@#$%^&*()")).toBe("");
  });

  it("handles numbers in text", () => {
    expect(slugify("Chapter 1: The Beginning")).toBe(
      "chapter-1-the-beginning"
    );
  });

  it("converts uppercase to lowercase", () => {
    expect(slugify("HELLO WORLD")).toBe("hello-world");
  });
});

// ---------------------------------------------------------------------------
// getInitials - extracts initials, max 2 chars
// ---------------------------------------------------------------------------
describe("getInitials", () => {
  it("extracts initials from two-word name", () => {
    expect(getInitials("John Doe")).toBe("JD");
  });

  it("extracts initial from single name", () => {
    expect(getInitials("Alice")).toBe("A");
  });

  it("limits to 2 characters for three+ word names", () => {
    expect(getInitials("Mary Jane Watson")).toBe("MJ");
  });

  it("returns uppercase initials", () => {
    expect(getInitials("jane doe")).toBe("JD");
  });

  it("handles empty string", () => {
    expect(getInitials("")).toBe("");
  });

  it("handles name with extra spaces", () => {
    // split(" ") creates ["John", "", "Doe"]; ""[0] is undefined
    // Array.join("") converts undefined to empty string, so result is "JD"
    const result = getInitials("John  Doe");
    expect(result).toBe("JD");
  });

  it("handles four-word name (takes first two initials)", () => {
    expect(getInitials("John Paul George Ringo")).toBe("JP");
  });

  it("handles single character name", () => {
    expect(getInitials("A")).toBe("A");
  });

  it("handles name with mixed case", () => {
    expect(getInitials("mARY jANE")).toBe("MJ");
  });
});
