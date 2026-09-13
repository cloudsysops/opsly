# Astral Arena — Touch selectors

On mobile Web, Godot `OptionButton` popups proved unreliable on iPhone Safari.

Quick Play therefore uses normal `Button` controls as deterministic cycle selectors:

- Mode;
- Guardian;
- Companion;
- Aura.

Each tap advances to the next value and immediately updates the visible label/summary.
No browser/native popup is required.

This is the preferred interaction for the family mobile demo because:
- touch hit targets are explicit;
- selection state is always visible;
- it behaves the same on Web, desktop and mobile;
- it avoids platform-specific popup behavior.

Keyboard/mouse users can click the same controls.
