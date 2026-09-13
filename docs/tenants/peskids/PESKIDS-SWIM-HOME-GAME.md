# Peskids Swim Home Game

## Product boundary

Peskids owns its own child/family swimming game.

It is **not** the Astral Arena game and it does not expose the Opsly Games Lab or emulator surface.

- Opsly / Astral Arena: game studio, original games, retro mechanics lab, Steam/web distribution.
- Peskids: swimming learning experience for children and parents.
- Shared infrastructure may be reused later, but branding, progression and player experience remain tenant-specific.

## V1 route

`/games`

Working title: **Peki en Casa**.

## V1 playable loop

Three short dry-land missions:

1. **Burbujas** — gentle exhale rhythm, with explicit no-breath-holding guidance.
2. **Flecha** — recognize a long/aligned swimming posture.
3. **Patada** — left/right coordination rhythm while seated on a stable chair.

Completing a mission stores one star locally in the browser.

No child name, age, photo, health information or other personal data is required.

## Parent mode

The same screen includes an expandable parent area with simple dry-land prompts:

- streamline posture on a clear floor/mat;
- alternating lower-leg coordination from a stable seated position;
- conversation prompts about confidence and what the child learned in class.

## Safety invariant

Home missions are dry-land only.

The product must never instruct a child to enter a pool, bathtub, tub or other body of water alone. Aquatic practice requires direct adult supervision and should follow the child's instructor.

Do not add breath-holding challenges, underwater timers, unsupervised water missions or competitive breath goals.

## Progress architecture

V1:

`browser localStorage -> mission stars`

Planned:

`family account -> student -> mission assigned by teacher or authorized support -> completion -> family portal progress -> teacher/support follow-up`

The planned sync must remain guardian-controlled and should avoid unnecessary child data.

## Next milestones

- add Peki visual assets once the canonical art is approved for the Peskids app;
- teacher- or authorized-support-assigned home missions;
- family account sync;
- age/level-aware mission catalog controlled by the academy;
- role-based assignment permissions for teacher/support;
- parent completion confirmation;
- rewards/badges that connect to real class progress without replacing instructor evaluation;
- offline/PWA support;
- accessibility and Spanish/English language toggle.
