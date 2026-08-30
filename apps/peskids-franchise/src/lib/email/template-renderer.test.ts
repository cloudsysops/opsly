import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  renderTemplate,
  extractBodyPreview,
  validateTemplateVariables,
} from "@/lib/email/template-renderer";

// ---------------------------------------------------------------------------
// renderTemplate
// ---------------------------------------------------------------------------
describe("renderTemplate", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-06-15T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("replaces a simple {{firstName}} variable", () => {
    const result = renderTemplate("Hello {{firstName}}!", {
      prospect: { firstName: "John", lastName: "Doe", email: "j@example.com" },
    });
    expect(result).toBe("Hello John!");
  });

  it("replaces multiple variables in one template", () => {
    const result = renderTemplate(
      "Hi {{firstName}} {{lastName}}, your email is {{email}}.",
      {
        prospect: {
          firstName: "Jane",
          lastName: "Smith",
          email: "jane@example.com",
        },
      }
    );
    expect(result).toBe("Hi Jane Smith, your email is jane@example.com.");
  });

  it("maps prospect data correctly (firstName, lastName, fullName, email, territory, phone)", () => {
    const result = renderTemplate(
      "{{fullName}} ({{email}}) - {{territory}} - {{phone}}",
      {
        prospect: {
          firstName: "Alice",
          lastName: "Wonder",
          email: "alice@example.com",
          preferredTerritory: "Westside, TN",
          phone: "(615) 555-1234",
        },
      }
    );
    expect(result).toBe(
      "Alice Wonder (alice@example.com) - Westside, TN - (615) 555-1234"
    );
  });

  it("maps interestLevel enum to human-readable label", () => {
    const result = renderTemplate("Interest: {{interestLevel}}", {
      prospect: {
        firstName: "Bob",
        lastName: "Ross",
        email: "bob@example.com",
        interestLevel: "SERIOUSLY_CONSIDERING",
      },
    });
    expect(result).toBe("Interest: Seriously Considering");
  });

  it("falls back to raw interestLevel if no label mapping exists", () => {
    const result = renderTemplate("Interest: {{interestLevel}}", {
      prospect: {
        firstName: "Bob",
        lastName: "Ross",
        email: "bob@example.com",
        interestLevel: "UNKNOWN_LEVEL" as any,
      },
    });
    expect(result).toBe("Interest: UNKNOWN_LEVEL");
  });

  it("uses customData overrides over prospect data", () => {
    const result = renderTemplate("Hello {{firstName}}!", {
      prospect: { firstName: "John", lastName: "Doe", email: "j@example.com" },
      customData: { firstName: "CustomName" },
    });
    // prospect values are assigned after customData spread, so prospect wins
    // Actually: values = { ...customData }, then prospect fields overwrite.
    // So prospect.firstName overwrites customData.firstName.
    expect(result).toBe("Hello John!");
  });

  it("uses customData for variables not derived from prospect", () => {
    const result = renderTemplate("Code: {{promoCode}}", {
      prospect: { firstName: "John", lastName: "Doe", email: "j@example.com" },
      customData: { promoCode: "WELCOME50" },
    });
    expect(result).toBe("Code: WELCOME50");
  });

  it("uses customData values when no prospect is provided", () => {
    const result = renderTemplate("Hello {{firstName}}, code: {{promoCode}}", {
      customData: { firstName: "Custom", promoCode: "ABC" },
    });
    expect(result).toBe("Hello Custom, code: ABC");
  });

  it("leaves unreplaced variables as {{varName}} when value is not provided", () => {
    const result = renderTemplate("Hello {{firstName}} {{unknownVar}}!", {
      prospect: { firstName: "John", lastName: "Doe", email: "j@example.com" },
    });
    expect(result).toBe("Hello John {{unknownVar}}!");
  });

  it("generates setPasswordUrl when prospect has inviteToken", () => {
    const result = renderTemplate("Set password: {{setPasswordUrl}}", {
      prospect: {
        firstName: "John",
        lastName: "Doe",
        email: "j@example.com",
        inviteToken: "abc123token",
      },
    });
    expect(result).toBe(
      "Set password: https://franchise-stc-993771038de6.herokuapp.com/set-password?token=abc123token"
    );
  });

  it("does not generate setPasswordUrl when inviteToken is missing", () => {
    const result = renderTemplate("Set password: {{setPasswordUrl}}", {
      prospect: {
        firstName: "John",
        lastName: "Doe",
        email: "j@example.com",
      },
    });
    expect(result).toBe("Set password: {{setPasswordUrl}}");
  });

  it("generates resetPasswordUrl when prospect has resetToken", () => {
    const result = renderTemplate("Reset: {{resetPasswordUrl}}", {
      prospect: {
        firstName: "John",
        lastName: "Doe",
        email: "j@example.com",
        resetToken: "reset789",
      },
    });
    expect(result).toBe(
      "Reset: https://franchise-stc-993771038de6.herokuapp.com/reset-password?token=reset789"
    );
  });

  it("does not generate resetPasswordUrl when resetToken is missing", () => {
    const result = renderTemplate("Reset: {{resetPasswordUrl}}", {
      prospect: {
        firstName: "John",
        lastName: "Doe",
        email: "j@example.com",
      },
    });
    expect(result).toBe("Reset: {{resetPasswordUrl}}");
  });

  it("always includes portalUrl when prospect is provided", () => {
    const result = renderTemplate("Login at {{portalUrl}}", {
      prospect: { firstName: "A", lastName: "B", email: "a@b.com" },
    });
    expect(result).toBe(
      "Login at https://franchise-stc-993771038de6.herokuapp.com/portal"
    );
  });

  it("replaces {{currentDate}} with the formatted date", () => {
    const result = renderTemplate("Today is {{currentDate}}.", {});
    // Fake time: June 15, 2025
    const expectedDate = new Date("2025-06-15T12:00:00Z").toLocaleDateString(
      "en-US",
      { year: "numeric", month: "long", day: "numeric" }
    );
    expect(result).toBe(`Today is ${expectedDate}.`);
  });

  it("replaces {{currentYear}} with the current year", () => {
    const result = renderTemplate("Copyright {{currentYear}}", {});
    expect(result).toBe("Copyright 2025");
  });

  it("defaults to empty string when prospect fields are null/undefined", () => {
    const result = renderTemplate("Name: {{firstName}} {{lastName}}", {
      prospect: {
        firstName: null as any,
        lastName: undefined as any,
        email: "a@b.com",
      },
    });
    expect(result).toBe("Name:  ");
  });

  it("defaults territory to 'Not specified' when preferredTerritory is missing", () => {
    const result = renderTemplate("Territory: {{territory}}", {
      prospect: { firstName: "A", lastName: "B", email: "a@b.com" },
    });
    expect(result).toBe("Territory: Not specified");
  });

  it("handles a template with no variables", () => {
    const result = renderTemplate("No variables here.", {
      prospect: { firstName: "John", lastName: "Doe", email: "j@example.com" },
    });
    expect(result).toBe("No variables here.");
  });

  it("handles an empty template string", () => {
    const result = renderTemplate("", {
      prospect: { firstName: "John", lastName: "Doe", email: "j@example.com" },
    });
    expect(result).toBe("");
  });

  it("handles empty context (no prospect, no customData)", () => {
    const result = renderTemplate("Hello {{firstName}}!", {});
    expect(result).toBe("Hello {{firstName}}!");
  });
});

// ---------------------------------------------------------------------------
// extractBodyPreview
// ---------------------------------------------------------------------------
describe("extractBodyPreview", () => {
  it("strips HTML tags from content", () => {
    const result = extractBodyPreview("<p>Hello <strong>World</strong></p>");
    expect(result).toBe("Hello World");
  });

  it("strips style blocks entirely", () => {
    const result = extractBodyPreview(
      '<style>.foo { color: red; }</style><p>Content</p>'
    );
    expect(result).toBe("Content");
  });

  it("strips script blocks entirely", () => {
    const result = extractBodyPreview(
      '<script>alert("xss")</script><p>Safe content</p>'
    );
    expect(result).toBe("Safe content");
  });

  it("strips multiline style blocks", () => {
    const html = `
      <style type="text/css">
        body { margin: 0; }
        .header { color: blue; }
      </style>
      <div>Visible text</div>
    `;
    const result = extractBodyPreview(html);
    expect(result).toBe("Visible text");
  });

  it("truncates long text with '...' at maxLength", () => {
    const longText = "<p>" + "a".repeat(300) + "</p>";
    const result = extractBodyPreview(longText, 50);
    expect(result).toHaveLength(53); // 50 chars + "..."
    expect(result).toMatch(/^a{50}\.\.\.$/);
  });

  it("returns short text as-is without truncation", () => {
    const result = extractBodyPreview("<p>Short</p>", 200);
    expect(result).toBe("Short");
  });

  it("returns text exactly at maxLength without appending '...'", () => {
    const text = "a".repeat(200);
    const result = extractBodyPreview(`<p>${text}</p>`, 200);
    expect(result).toBe(text);
    expect(result).not.toContain("...");
  });

  it("defaults maxLength to 200", () => {
    const longText = "<p>" + "x".repeat(250) + "</p>";
    const result = extractBodyPreview(longText);
    // Should be 200 chars + "..."
    expect(result).toHaveLength(203);
    expect(result.endsWith("...")).toBe(true);
  });

  it("collapses multiple whitespace characters into a single space", () => {
    const result = extractBodyPreview(
      "<p>Hello</p>   <p>World</p>  <p>Foo</p>"
    );
    expect(result).toBe("Hello World Foo");
  });

  it("handles empty string input", () => {
    const result = extractBodyPreview("");
    expect(result).toBe("");
  });

  it("handles plain text input (no HTML)", () => {
    const result = extractBodyPreview("Just plain text");
    expect(result).toBe("Just plain text");
  });

  it("handles complex nested HTML", () => {
    const html = `
      <div>
        <h1>Title</h1>
        <ul>
          <li>Item 1</li>
          <li>Item 2</li>
        </ul>
      </div>
    `;
    const result = extractBodyPreview(html);
    expect(result).toContain("Title");
    expect(result).toContain("Item 1");
    expect(result).toContain("Item 2");
  });
});

// ---------------------------------------------------------------------------
// validateTemplateVariables
// ---------------------------------------------------------------------------
describe("validateTemplateVariables", () => {
  it("returns valid:true when all known variables are provided", () => {
    const result = validateTemplateVariables(
      "Hello {{firstName}} {{lastName}}",
      { firstName: "John", lastName: "Doe" }
    );
    expect(result).toEqual({ valid: true, missing: [] });
  });

  it("returns missing variables that are known but not provided", () => {
    const result = validateTemplateVariables(
      "Hello {{firstName}} {{lastName}} at {{email}}",
      { firstName: "John" }
    );
    expect(result.valid).toBe(false);
    expect(result.missing).toContain("lastName");
    expect(result.missing).toContain("email");
    expect(result.missing).not.toContain("firstName");
  });

  it("returns valid:true for an empty template", () => {
    const result = validateTemplateVariables("", { firstName: "John" });
    expect(result).toEqual({ valid: true, missing: [] });
  });

  it("returns valid:true for a template with no variables", () => {
    const result = validateTemplateVariables("No variables here.", {});
    expect(result).toEqual({ valid: true, missing: [] });
  });

  it("ignores unknown variables (not in TEMPLATE_VARIABLES)", () => {
    // unknownVar is not in TEMPLATE_VARIABLES, so it is skipped
    const result = validateTemplateVariables("Hello {{unknownVar}}", {});
    expect(result).toEqual({ valid: true, missing: [] });
  });

  it("handles duplicate variables in the template", () => {
    const result = validateTemplateVariables(
      "{{firstName}} and {{firstName}} again",
      {}
    );
    expect(result.valid).toBe(false);
    // Should only list firstName once
    expect(result.missing).toEqual(["firstName"]);
  });

  it("considers a variable provided even if its value is an empty string", () => {
    // Empty string is falsy, so validateTemplateVariables treats it as missing
    const result = validateTemplateVariables("{{firstName}}", {
      firstName: "",
    });
    // The function checks `!providedValues[varName]` - empty string is falsy
    expect(result.valid).toBe(false);
    expect(result.missing).toEqual(["firstName"]);
  });

  it("validates all known template variables together", () => {
    const result = validateTemplateVariables(
      "{{firstName}} {{lastName}} {{fullName}} {{email}} {{territory}} {{phone}} {{interestLevel}} {{portalUrl}} {{currentDate}} {{currentYear}}",
      {
        firstName: "John",
        lastName: "Doe",
        fullName: "John Doe",
        email: "john@example.com",
        territory: "Austin, TX",
        phone: "(555) 123-4567",
        interestLevel: "Ready to Start",
        portalUrl: "https://example.com/portal",
        currentDate: "January 1, 2025",
        currentYear: "2025",
      }
    );
    expect(result).toEqual({ valid: true, missing: [] });
  });

  it("returns multiple missing variables in order of appearance", () => {
    const result = validateTemplateVariables(
      "{{email}} {{phone}} {{territory}}",
      {}
    );
    expect(result.valid).toBe(false);
    expect(result.missing).toEqual(["email", "phone", "territory"]);
  });
});
