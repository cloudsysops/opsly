import { NotionClient } from '../notion-client.js';
import type { QualityGate } from '../types.js';

export interface QualityGateResult {
  readonly success: true;
  readonly gate: QualityGate;
  readonly message: string;
}

export async function handleQualityGate(
  params: Omit<QualityGate, 'id' | 'lastChecked'>
): Promise<QualityGateResult> {
  const notion = new NotionClient();
  const gate = await notion.recordQualityGate(params);
  return {
    success: true,
    gate,
    message: `Quality gate recorded: ${gate.checkName} — ${gate.status}`,
  };
}
