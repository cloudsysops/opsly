# Palette's Journal - Critical UX/Accessibility Learnings

## 2025-05-22 - Toggle Visibility for Sensitive Data
**Learning:** Providing a toggle to hide revealed credentials (like passwords) is a fundamental UX pattern that prevents users from being forced to wait for an auto-hide timer, improving both privacy and user control.
**Action:** Implement toggle visibility (Eye/EyeOff icons) for all sensitive credential reveal components.

## 2025-05-22 - Root Dependency Overrides for Monorepo Stability
**Learning:** In a monorepo, inconsistent versions of foundational libraries like `undici` can break test environments (e.g., `jsdom` in Vitest).
**Action:** Use root `package.json` overrides to align critical dependencies across all workspaces when version mismatches occur.

## 2025-05-23 - Accessible Chat Interfaces
**Learning:** For dynamic chat interfaces, using `aria-live="polite"` on message containers and standardizing loading states with `Loader2` spinners ensures that screen reader users are notified of new messages and provides a professional, consistent feedback loop.
**Action:** Always include `aria-live` regions in chat-like components and use shared `Loader2` icons for async loading states.
