import { getCharacter } from '@intcloudsysops/universe';
import { GAME_SCHEMA_VERSION } from './constants.js';
import { recordEvent } from './events.js';
import { newId } from './ids.js';
import { ExplorerIdentitySchema } from './schemas.js';
import { assertSafeDisplayName } from './safety.js';
import type { GameStore } from './store.js';
import type { ChooseExplorerInput, ExplorerIdentity } from './types.js';

export function chooseExplorer(
  store: GameStore,
  sessionId: string,
  input: ChooseExplorerInput,
  now: () => Date,
): ExplorerIdentity {
  assertSafeDisplayName(input.displayName);
  if (input.companionCharacterId) {
    getCharacter(input.companionCharacterId);
  }
  const explorer = ExplorerIdentitySchema.parse({
    schemaVersion: GAME_SCHEMA_VERSION,
    explorerId: newId('explorer'),
    displayName: input.displayName,
    appearance: {
      palette: input.palette ?? 'gold-navy',
      companionCharacterId: input.companionCharacterId,
    },
    interestTags: input.interestTags ?? [],
  });
  const state = store.get(sessionId);
  state.player = { ...state.player, explorer };
  store.put(state);
  recordEvent(store, {
    sessionId,
    type: 'explorer.chosen',
    evidence: 'Explorer chose appearance and optional companion',
    context: { palette: explorer.appearance.palette },
    now,
  });
  return explorer;
}
