import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const DEFAULT_CONFIG_PATH = resolve(ROOT, 'config/pc-gamer-tools.json');
const DEFAULT_DISPATCHER = resolve(ROOT, 'scripts/opsly-live-obs.sh');

export const OBS_SCOPES = Object.freeze({
  READ: 'OBS_READ',
  CONTROL: 'OBS_CONTROL',
  ADMIN: 'OBS_ADMIN',
});

const ACTION_SCOPE = Object.freeze({
  get_version: OBS_SCOPES.READ,
  get_stream_status: OBS_SCOPES.READ,
  get_stats: OBS_SCOPES.READ,
  get_record_status: OBS_SCOPES.READ,
  get_current_program_scene: OBS_SCOPES.READ,
  get_scene_list: OBS_SCOPES.READ,
  start_record: OBS_SCOPES.CONTROL,
  stop_record: OBS_SCOPES.CONTROL,
  pause_record: OBS_SCOPES.CONTROL,
  resume_record: OBS_SCOPES.CONTROL,
  save_replay_buffer: OBS_SCOPES.CONTROL,
  set_current_program_scene: OBS_SCOPES.CONTROL,
});

const HIGH_IMPACT_ACTIONS = new Set(['stop_record']);

export async function loadCreatorObsPolicy(configPath = DEFAULT_CONFIG_PATH) {
  const raw = JSON.parse(await readFile(configPath, 'utf8'));
  const obs = raw?.tools?.obs;
  if (!obs || !Array.isArray(obs.allowedActions) || !Array.isArray(obs.blockedActions)) {
    throw new Error('OBS policy is missing or malformed');
  }
  return {
    allowedActions: new Set(obs.allowedActions),
    blockedActions: new Set(obs.blockedActions),
    endpoint: obs.endpoint,
    transport: obs.transport,
  };
}

export function authorizeCreatorObsAction({
  action,
  scopes,
  policy,
  confirmed = false,
}) {
  if (typeof action !== 'string' || !action) {
    throw new Error('OBS action is required');
  }

  if (policy.blockedActions.has(action)) {
    throw new Error(`OBS action "${action}" is blocked by policy`);
  }

  if (!policy.allowedActions.has(action)) {
    throw new Error(`OBS action "${action}" is not allowlisted`);
  }

  const requiredScope = ACTION_SCOPE[action];
  if (!requiredScope) {
    throw new Error(`OBS action "${action}" has no Creator OS scope mapping`);
  }

  const scopeSet = scopes instanceof Set ? scopes : new Set(scopes ?? []);
  if (!scopeSet.has(requiredScope) && !scopeSet.has(OBS_SCOPES.ADMIN)) {
    throw new Error(`OBS action "${action}" requires ${requiredScope}`);
  }

  if (HIGH_IMPACT_ACTIONS.has(action) && !confirmed) {
    throw new Error(`OBS action "${action}" requires explicit confirmation`);
  }

  return { action, requiredScope };
}

export async function runCreatorObsAction(payload, options = {}) {
  const policy = options.policy ?? (await loadCreatorObsPolicy(options.configPath));
  authorizeCreatorObsAction({
    action: payload?.action,
    scopes: options.scopes,
    policy,
    confirmed: options.confirmed === true,
  });

  const dispatcher = options.dispatcher ?? DEFAULT_DISPATCHER;
  const execute = options.execute ?? execFileAsync;
  const serialized = JSON.stringify(payload);

  const { stdout, stderr } = await execute(dispatcher, [serialized], {
    cwd: ROOT,
    env: process.env,
    timeout: options.timeoutMs ?? 8_000,
    maxBuffer: 256 * 1024,
  });

  if (stderr?.trim()) {
    throw new Error(`OBS dispatcher error: ${stderr.trim()}`);
  }

  let parsed;
  try {
    parsed = JSON.parse(stdout.trim());
  } catch {
    throw new Error('OBS dispatcher returned non-JSON output');
  }

  if (!parsed?.ok) {
    throw new Error(parsed?.error ? String(parsed.error) : 'OBS dispatcher failed');
  }

  return {
    data: parsed.data ?? null,
    provenance: {
      sourceClass: 'obs',
      fairPlayCertified: true,
      adapterId: 'opsly-obs-websocket-5',
    },
  };
}
