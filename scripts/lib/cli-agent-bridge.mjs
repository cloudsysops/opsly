/**
 * Pure helpers for the local CLI agent bridge (`scripts/cli-agent-service.ts`).
 * No secrets. No network. Safe to unit-test.
 *
 * Canonical POST /execute body:
 *   prompt_content  required non-empty string
 *   job_id          optional (UUID generated if missing)
 *   requestId       optional alias; worker uses job_id / job.id
 *   agent_role      optional (default: bridge agent name)
 *   max_steps       optional number
 *   model           optional (default: OPSLY_OPENCODE_MODEL)
 *   prompt          legacy fallback for prompt_content only
 *
 * Empty / whitespace prompt_content → HTTP 400 VALIDATION_ERROR
 * Missing binary → HTTP 503 AGENT_BINARY_NOT_FOUND
 */

import { existsSync as defaultExistsSync } from 'node:fs';

export const DEFAULT_OUTPUT_LIMIT_BYTES = 120_000;

const SECRET_PATTERNS = [
  /sk-[A-Za-z0-9_-]{12,}/g,
  /nvapi-[A-Za-z0-9_-]{12,}/g,
  /Bearer\s+[A-Za-z0-9._-]+/gi,
  /(api[_-]?key|token|password)=([^\s]+)/gi,
];

/**
 * @param {string} value
 * @returns {string}
 */
export function redactSecrets(value) {
  let next = String(value ?? '');
  next = next.replace(SECRET_PATTERNS[0], 'sk-***');
  next = next.replace(SECRET_PATTERNS[1], 'nvapi-***');
  next = next.replace(SECRET_PATTERNS[2], 'Bearer ***');
  next = next.replace(SECRET_PATTERNS[3], '$1=***');
  return next;
}

/**
 * @param {unknown} body
 * @returns {string}
 */
export function promptContentFromBody(body) {
  if (!body || typeof body !== 'object') return '';
  const record = /** @type {Record<string, unknown>} */ (body);
  if (typeof record.prompt_content === 'string') return record.prompt_content;
  if (typeof record.prompt === 'string') return record.prompt;
  return '';
}

/**
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {string[]}
 */
export function extraSearchPaths(env = process.env) {
  const home = (env.HOME || env.USERPROFILE || '').trim();
  const paths = [];
  if (home) {
    paths.push(`${home}/.npm-global/bin`);
    paths.push(`${home}/.local/bin`);
  }
  const explicitDir = (env.OPSLY_CLI_AGENT_BIN_DIR || '').trim();
  if (explicitDir) paths.push(explicitDir);
  return paths;
}

/**
 * @param {string} command
 * @param {{ env?: NodeJS.ProcessEnv, existsSync?: (p: string) => boolean, pathEnv?: string }} [opts]
 * @returns {string}
 */
export function resolveAgentCommand(command, opts = {}) {
  const env = opts.env || process.env;
  const exists = opts.existsSync || defaultExistsSync;

  const explicit = (env.OPSLY_CLI_AGENT_BIN || '').trim();
  if (explicit && exists(explicit)) return explicit;

  if (!command || command.includes('/') || command.includes('\\')) {
    return command;
  }

  const search = [
    ...extraSearchPaths(env),
    ...(opts.pathEnv || env.PATH || '').split(':').filter(Boolean),
  ];

  for (const dir of search) {
    const candidate = `${dir.replace(/\/$/, '')}/${command}`;
    if (exists(candidate)) return candidate;
  }

  return command;
}

/**
 * @param {unknown} error
 * @returns {{ status: number, errorCode: string, error: string }}
 */
export function classifySpawnError(error) {
  const err = error && typeof error === 'object' ? /** @type {NodeJS.ErrnoException} */ (error) : null;
  const raw = redactSecrets(err?.message || String(error));
  if (err?.code === 'ENOENT' || /ENOENT/i.test(raw)) {
    return {
      status: 503,
      errorCode: 'AGENT_BINARY_NOT_FOUND',
      error: 'agent binary not found in PATH (set OPSLY_CLI_AGENT_BIN or install the existing CLI)',
    };
  }
  if (/timed out/i.test(raw)) {
    return { status: 504, errorCode: 'AGENT_TIMEOUT', error: raw.slice(0, 300) };
  }
  return { status: 500, errorCode: 'AGENT_SPAWN_FAILED', error: raw.slice(0, 300) };
}

/**
 * @param {number} status
 * @param {Record<string, unknown> | null} body
 * @param {string} agent
 * @returns {{ unrecoverable: boolean, errorCode: string, message: string }}
 */
export function mapBridgeHttpFailure(status, body, agent) {
  const errorCode =
    typeof body?.errorCode === 'string' && body.errorCode.trim()
      ? body.errorCode.trim()
      : status === 400
        ? 'VALIDATION_ERROR'
        : status === 401
          ? 'UNAUTHORIZED'
          : status === 503
            ? 'AGENT_BINARY_NOT_FOUND'
            : 'BRIDGE_HTTP_ERROR';
  const raw =
    (typeof body?.error === 'string' && body.error) ||
    (typeof body?.message === 'string' && body.message) ||
    `${agent} service error: ${status}`;
  const message = redactSecrets(raw).slice(0, 300);
  const unrecoverable =
    status === 400 ||
    status === 401 ||
    errorCode === 'VALIDATION_ERROR' ||
    errorCode === 'AGENT_BINARY_NOT_FOUND';
  return { unrecoverable, errorCode, message };
}
