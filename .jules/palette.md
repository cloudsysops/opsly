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

## 2025-05-22 - Accessible Chat and Dialog Pattern
**Learning:** Floating interactive components like feedback chats often lack proper keyboard navigation and ARIA state communication, making them invisible or unusable for assistive technology users.
**Action:** Implement `Escape` key dismissal, use `aria-expanded`/`aria-controls` for toggles, and ensure dialogs have `role="dialog"` with `aria-labelledby` pointing to a semantic heading (e.g., `h2`).

## 2026-05-27 - Ambiguous Labels in PasswordInput
**Learning:** The `PasswordInput` component includes an eye icon button with an `aria-label` containing "contraseña". This can cause `get_by_label("Contraseña")` in Playwright or screen readers to match multiple elements, leading to ambiguity.
**Action:** Always use exact matching or specific ARIA roles when targeting inputs with associated toggle buttons to ensure the primary input is correctly identified.

## 2026-05-28 - Focus Indicators for Dropdowns and Text Areas
**Learning:** Standard `<select>` dropdowns and `<textarea>` components in complex enterprise forms are frequently left with basic browser-default focus state behaviors. This creates an inconsistent and unpolished user experience and can lead to failures under strict WCAG accessibility guidelines on focus indicators if the focus outline becomes indistinguishable against dark-themed layouts.
**Action:** Always map standard `<select>` and `<textarea>` styles to match custom text `<Input>` focus-visible rings using Tailwind's `focus-visible:ring-2` class with cohesive theme palettes.

## 2026-05-29 - Status Indicator Dot Pattern
**Learning:** Text-only status badges rely solely on color or reading label text to communicate status health. Adding a subtle `bg-current` status dot with `aria-hidden="true"` provides dual visual cues (shape + color) for low-vision users while keeping screen reader output clean and free of redundant decorative elements.
**Action:** Include an `aria-hidden="true"` dot element (`bg-current`) inside status badge components to reinforce health states visually without cluttering assistive technology output.
