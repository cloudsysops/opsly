# @intcloudsysops/universe

Canonical **Opsly Universe** IP: characters, worlds, Visual DNA, relationships, story contracts, and prompt builders.

Content agents **consume** this module. This module **does not** depend on Content Studio, YouTube, or Peskids.

```text
OPSLY UNIVERSE → Context Composer → Story / Image / Video agents → Content Agent → tenants
```

## Use

```ts
import { universe } from '@intcloudsysops/universe';

universe.getCharacter('nova');

universe.getContext({
  characters: ['nova', 'kai'],
  topic: 'swimming',
  audience: 'kids',
  tenant: 'peskids',
});

universe.buildImagePrompt({
  character: 'nova',
  scene: 'discovering an underwater city',
  mood: 'wonder',
  aspectRatio: '9:16',
});
```

CLI:

```bash
npm run universe -- characters
npm run universe -- show nova
npm run universe -- prompt nova image
npm run universe -- story --characters nova,kai --topic "why robots learn" --world nexus
npm run universe -- export
```

Machine-readable snapshot: `config/universe/*.json` (`canonVersion: "1.0"`).

Skill: `opsly-universe`.
