## 2026-05-26 - Accessible Form Pattern
**Learning:** Standard HTML forms in the marketplace were missing explicit associations between labels and inputs, making them difficult for screen reader users to navigate.
**Action:** Always use `htmlFor` on `<label>` and a matching `id` on form controls (`<input>`, `<textarea>`, `<select>`) to ensure the accessible name is correctly associated.

# Palette's Journal - Critical UX/Accessibility Learnings

## 2025-05-22 - Toggle Visibility for Sensitive Data
**Learning:** Providing a toggle to hide revealed credentials (like passwords) is a fundamental UX pattern that prevents users from being forced to wait for an auto-hide timer, improving both privacy and user control.
**Action:** Implement toggle visibility (Eye/EyeOff icons) for all sensitive credential reveal components.

## 2025-05-22 - Root Dependency Overrides for Monorepo Stability
**Learning:** In a monorepo, inconsistent versions of foundational libraries like `undici` can break test environments (e.g., `jsdom` in Vitest).
**Action:** Use root `package.json` overrides to align critical dependencies across all workspaces when version mismatches occur.

## 2025-05-22 - Transient Feedback for Clipboard Actions
**Learning:** Adding a "Copy" button with transient visual feedback (swapping the icon to `Check` and label to "Copiado" for 2 seconds) significantly improves user confidence that the action was successful without cluttering the UI with permanent notifications.
**Action:** Use a 2-second feedback loop with `Check` and `Copy` icons for all clipboard-copy interactions.
