import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  createIcsoAgencyProfile,
  parseMissionControlProfile,
  type MissionControlProfile,
} from '@intcloudsysops/mission-control-kit';

function resolveRepoRoot(): string {
  const cwd = process.cwd();
  if (existsSync(join(cwd, 'config', 'mission-control'))) return cwd;
  if (existsSync(join(cwd, '..', '..', 'config', 'mission-control'))) {
    return join(cwd, '..', '..');
  }
  return cwd;
}

/** Load ICSO profile from config JSON with preset fallback. */
export async function loadIcsoMissionControlProfile(): Promise<MissionControlProfile> {
  const path = join(resolveRepoRoot(), 'config', 'mission-control', 'profiles', 'icso.json');
  if (!existsSync(path)) {
    return createIcsoAgencyProfile();
  }
  try {
    const raw = await readFile(path, 'utf8');
    return parseMissionControlProfile(JSON.parse(raw));
  } catch {
    return createIcsoAgencyProfile();
  }
}
