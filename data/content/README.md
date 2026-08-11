# Opsly Brand Content — Content Production MVP

Planned, character-driven brand video content for Opsly's own channel(s) —
**not** the tenant event-driven content system (that lives in
`lib/content-studio` and is documented in
[`docs/00-architecture/CONTENT-STUDIO-ARCHITECTURE.md`](../../docs/00-architecture/CONTENT-STUDIO-ARCHITECTURE.md)).

See [`docs/00-architecture/CONTENT-PRODUCTION-MVP.md`](../../docs/00-architecture/CONTENT-PRODUCTION-MVP.md)
for the full architecture writeup and how this relates to that system.

## Layout

```
data/content/
  characters/            # Character Bible — one JSON per character
    opsly-founder.json
    opsly-robot-luna.json
    wavo.json

  series/
    opsly-origins/
      series.json
      episodes/
        <slug>/
          episode.json    # required
          script.md        # only for episodes past "idea" stage
    peki-lab/
    build-with-opsly/

  campaigns/
    opsly-channel-launch-30-days/
      campaign.json       # 30-day schedule referencing episode ids above
```

## Reading this data

Load and validate everything through `@intcloudsysops/content-studio`
(`lib/content-studio`) — never parse these JSON files by hand elsewhere:

```ts
import { CharacterRegistry, SeriesRegistry, EpisodeManager, CampaignManager } from '@intcloudsysops/content-studio';

const characters = new CharacterRegistry({ charactersDir: 'data/content/characters' });
const series = new SeriesRegistry({ seriesDir: 'data/content/series' });
const episodes = new EpisodeManager({ seriesDir: 'data/content/series' });
const campaign = new CampaignManager('data/content/campaigns/opsly-channel-launch-30-days/campaign.json');
```

Or via CLI: `npm run content:list`, `content:episode -- <id>`, `content:calendar`,
`content:validate`, `content:render-plan -- <id>`.

## Production status

Episode `production.status` moves through:
`idea → script → storyboard → assets → rendered → reviewed → published → archived`

Only `opsly-origins-001` (the pilot) is fully scripted (`storyboard` stage) as
of this MVP. The other 15 episodes in the 30-day launch campaign are at
`idea` stage — title, hook, objective, and calendar slot defined, script and
scenes pending.

## What this MVP does NOT do

- No automatic video rendering (see `buildEpisodeRenderPlan` — dry-run only)
- No automatic publishing to any platform
- No paid service calls of any kind
- No worker/Docker orchestration (that's `feat/pc-gamer-worker-plane`, a
  separate in-flight branch — this MVP integrates with it later via the
  existing `OPSLY_WORKER_ALLOWLIST` pattern, it does not reimplement it)
