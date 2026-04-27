import { MODES_REGISTRY } from './registry.js';

function includesWithWildcard(values: string[], candidate: string): boolean {
  return values.includes('*') || values.includes(candidate);
}

export function enforceModePermissions(toolName: string, modeId: string): true {
  const mode = MODES_REGISTRY[modeId] ?? MODES_REGISTRY.developer;

  const explicitlyAllowed = includesWithWildcard(mode.allowedTools, toolName);
  if (!explicitlyAllowed) {
    throw new Error('Tool forbidden by current mode');
  }

  const blocked = mode.blockedTools.includes('*')
    ? !mode.allowedTools.includes(toolName)
    : includesWithWildcard(mode.blockedTools, toolName);

  if (blocked) {
    throw new Error('Tool forbidden by current mode');
  }

  return true;
}
