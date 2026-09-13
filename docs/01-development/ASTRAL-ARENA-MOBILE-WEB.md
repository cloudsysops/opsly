# Astral Arena — Mobile Web UX

## Baseline

Web/mobile now uses a **1280×720 logical canvas** instead of 1920×1080.

Reason: on phones the previous 1920 logical viewport caused Godot to scale every
control down too aggressively, making labels and touch targets look tiny.

Settings:

- viewport: 1280×720;
- stretch: `canvas_items`;
- aspect: `expand`;
- Web canvas resize policy remains full-window.

## Mobile layout rules

- primary touch targets should be ~48 logical px or larger;
- Quick Play controls use 720 px central width;
- battle HUD is laid out for 1280×720;
- battle buttons use explicit larger font/minimum sizes;
- keyboard-only hints are replaced by touch-friendly wording.

## Recommended play orientation

Landscape is preferred on phones for the current battle UX.

Portrait remains usable for navigation, but the playable battle surface is designed
around a 16:9 landscape presentation.

## QA

Test at minimum:
- iPhone Safari landscape;
- iPhone Safari portrait navigation;
- Android Chrome landscape;
- desktop 1280×720;
- desktop 1920×1080.

Verify:
- JUGAR AHORA is readable without zoom;
- option controls are tappable;
- 2D ↔ 3D button is easy to hit;
- all ability buttons wrap and remain visible;
- menu/restart remain accessible;
- no battle card is clipped.
