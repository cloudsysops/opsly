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

## 2026-06-13 - Enhanced Credential Management UX
**Learning:** Adding a 'Copy' button with immediate visual confirmation (checkmark and label change) alongside a reveal toggle significantly improves the usability of sensitive data fields by reducing manual selection effort.
**Action:** Always pair revealable sensitive data with a one-click copy button and temporary success feedback.
