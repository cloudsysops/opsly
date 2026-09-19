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

`class/progress event -> n8n rule engine OR teacher/support assignment -> student mission -> completion -> family portal progress -> teacher/support follow-up`

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


## Automatic assignment with n8n

n8n may assign or recommend a home mission automatically when a trusted Peskids event is received.

Examples:

- class completed;
- attendance recorded;
- instructor marks a skill as needing reinforcement;
- student reaches a level/stage;
- previous home mission completed;
- support records a follow-up reason.

Canonical flow:

`Peskids event -> n8n workflow -> eligibility/rule check -> mission assignment -> family notification -> completion event -> progress update`

Guardrails:

- n8n must use the same assignment contract as teacher/support; it must not create a parallel mission system;
- every automatic assignment records `assigned_by = automation`, workflow/rule id, timestamp and reason;
- teacher or authorized support can override, replace or cancel an automatic assignment;
- automation may only choose from an academy-approved mission catalog;
- no autonomous water-practice instruction;
- no breath-holding or underwater challenge generation;
- safety-critical or ambiguous cases should route to human review instead of auto-assigning.

Recommended modes:

1. **recommend_only** — n8n proposes a mission for teacher/support approval.
2. **auto_assign_safe** — n8n directly assigns pre-approved low-risk dry-land missions.
3. **human_required** — the event creates a support/teacher task but does not assign a mission.

Start with `recommend_only`, then enable `auto_assign_safe` only for explicit academy-approved rules.
