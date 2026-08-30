import { Heading } from "@tiptap/extension-heading";

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Extends the default TipTap Heading node to support an `id` attribute.
 * - Parses `id` from incoming HTML (preserves seeded anchor IDs)
 * - Renders the `id` attribute in HTML output
 * - Auto-generation of IDs from heading text is handled by ManualEditor
 */
export const HeadingWithId = Heading.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      id: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute("id"),
        renderHTML: (attributes: Record<string, unknown>) => {
          if (!attributes.id) return {};
          return { id: attributes.id };
        },
      },
    };
  },
});
