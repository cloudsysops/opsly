export type LocalControlMode = 'opsly_control' | 'ide_fallback';

const VALID_CONTROL_MODES: readonly LocalControlMode[] = ['opsly_control', 'ide_fallback'];

let runtimeControlMode: LocalControlMode = parseControlMode(process.env.OPSLY_LOCAL_CONTROL_MODE);

export function parseControlMode(raw: unknown): LocalControlMode {
  if (typeof raw !== 'string') {
    return 'opsly_control';
  }

  const normalized = raw.trim();
  return VALID_CONTROL_MODES.includes(normalized as LocalControlMode)
    ? (normalized as LocalControlMode)
    : 'opsly_control';
}

export function getLocalControlMode(): LocalControlMode {
  return runtimeControlMode;
}

export function setLocalControlMode(mode: LocalControlMode): LocalControlMode {
  runtimeControlMode = mode;
  return runtimeControlMode;
}

export function listLocalControlModes(): readonly LocalControlMode[] {
  return VALID_CONTROL_MODES;
}
