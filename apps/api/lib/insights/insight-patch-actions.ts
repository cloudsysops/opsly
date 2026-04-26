import { markInsightRead, markInsightStatus } from './engine';

/**
 * Aplica una acción sobre un insight (portal y admin).
 * @returns false si la acción no es reconocida.
 */
export async function applyInsightPatchAction(
  action: string,
  insightId: string,
  tenantId: string
): Promise<boolean> {
  const handlers: Record<string, () => Promise<void>> = {
    read: async () => {
      await markInsightRead(insightId, tenantId);
    },
    dismiss: async () => {
      await markInsightStatus({
        insightId,
        tenantId,
        status: 'dismissed',
      });
    },
    action: async () => {
      await markInsightStatus({
        insightId,
        tenantId,
        status: 'actioned',
      });
    },
  };
  const run = handlers[action];
  if (run === undefined) {
    return false;
  }
  await run();
  return true;
}
