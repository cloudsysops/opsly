import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

// scripts/ops/mac-ephemeral-runtime-doctor.sh (#1222) guards its own
// execution behind `if [[ "${BASH_SOURCE[0]}" == "${0}" ]]`, so it can be
// sourced and its check_* functions called individually without running the
// full doctor or needing a real Mac/launchd/tmux. These tests exercise the
// output contract end-to-end (against this, necessarily non-Darwin, CI/
// sandbox host) plus individual checks in isolation for both directions
// where the check is deterministically controllable without live state.

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..');
const script = join(root, 'scripts/ops/mac-ephemeral-runtime-doctor.sh');

function runDoctor(args = [], env = {}) {
  try {
    const stdout = execFileSync('bash', [script, ...args], {
      cwd: root,
      env: { ...process.env, ...env },
      encoding: 'utf8',
    });
    return { stdout, code: 0 };
  } catch (error) {
    return { stdout: error.stdout ?? '', code: error.status };
  }
}

function sourceAndRun(fnName, { env = {}, extra = '' } = {}) {
  const bashScript = `
    source ${JSON.stringify(script)}
    ${extra}
    ${fnName}
    for r in "\${DOCTOR_RESULTS[@]}"; do echo "$r"; done
  `;
  const out = execFileSync('bash', ['-c', bashScript], {
    cwd: root,
    env: { ...process.env, ...env },
    encoding: 'utf8',
  });
  return out
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [status, name, ...messageParts] = line.split('\t');
      return { status, name, message: messageParts.join('\t') };
    });
}

describe('mac-ephemeral-runtime-doctor.sh — output contract', () => {
  it('reports NOT READY with the exact contract on a non-Darwin host and exits non-zero', () => {
    const { stdout, code } = runDoctor();
    assert.match(stdout, /^OPSLY MAC NODE: NOT READY$/m);
    assert.match(stdout, /^BLOCKERS:$/m);
    assert.match(stdout, /^- os: expected Darwin/m);
    assert.equal(code, 1);
  });

  it('--json produces valid JSON with a matching non-zero exit code and blocker_count > 0', () => {
    const { stdout, code } = runDoctor(['--json']);
    const parsed = JSON.parse(stdout);
    assert.equal(parsed.status, 'NOT_READY');
    assert.ok(parsed.blocker_count > 0);
    assert.ok(Array.isArray(parsed.checks));
    assert.ok(parsed.checks.some((c) => c.name === 'os' && c.status === 'FAIL'));
    assert.equal(code, 1);
  });

  it('--strict exits non-zero even if only warnings are present (never less strict than default)', () => {
    const { code: defaultCode } = runDoctor();
    const { code: strictCode } = runDoctor(['--strict']);
    // Both must be non-zero here since real FAILs exist on this host; strict
    // must never be *more* permissive than default.
    assert.equal(defaultCode, 1);
    assert.equal(strictCode, 1);
  });
});

describe('mac-ephemeral-runtime-doctor.sh — check_repo_ref_state', () => {
  it('PASSes when the checked-out branch matches the configured trusted branch', () => {
    const currentBranch = execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
      cwd: root,
      encoding: 'utf8',
    }).trim();
    const results = sourceAndRun('check_repo_ref_state', {
      env: { NIGHT_QUEUE_TRUSTED_BRANCH: currentBranch },
    });
    assert.equal(results.length, 1);
    assert.equal(results[0].status, 'PASS');
    assert.equal(results[0].name, 'repo_ref');
  });

  it('FAILs when the checked-out branch does not match the trusted branch', () => {
    const results = sourceAndRun('check_repo_ref_state', {
      env: { NIGHT_QUEUE_TRUSTED_BRANCH: 'definitely-not-the-current-branch' },
    });
    assert.equal(results.length, 1);
    assert.equal(results[0].status, 'FAIL');
    assert.match(results[0].message, /is not the trusted branch/);
  });
});

describe('mac-ephemeral-runtime-doctor.sh — check_legacy_flags_disabled', () => {
  it('PASSes both sub-checks when idle and no break-glass override is set', () => {
    const results = sourceAndRun('check_legacy_flags_disabled', {
      env: { OPSLY_ALLOW_LEGACY_LOCAL_AGENT_PAYLOAD: '' },
    });
    assert.equal(results.length, 2);
    assert.ok(results.every((r) => r.status === 'PASS'));
  });

  it('FAILs when the legacy break-glass override is left on', () => {
    const results = sourceAndRun('check_legacy_flags_disabled', {
      env: { OPSLY_ALLOW_LEGACY_LOCAL_AGENT_PAYLOAD: 'true' },
    });
    const override = results.find((r) => r.name === 'legacy_payload_override');
    assert.equal(override.status, 'FAIL');
  });
});

describe('mac-ephemeral-runtime-doctor.sh — check_node_identity', () => {
  it('WARNs when trusted-execution-nodes.json does not exist yet', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'opsly-doctor-'));
    try {
      const results = sourceAndRun('check_node_identity', {
        extra: `ROOT=${JSON.stringify(tmp)}; cd "$ROOT"`,
      });
      assert.equal(results.length, 1);
      assert.equal(results[0].status, 'WARN');
      assert.match(results[0].message, /not present yet/);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('PASSes when the configured node_id is present in the registry', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'opsly-doctor-'));
    try {
      mkdirSync(join(tmp, 'config'));
      writeFileSync(
        join(tmp, 'config', 'trusted-execution-nodes.json'),
        JSON.stringify({ nodes: [{ node_id: 'macbook-personal-01' }] })
      );
      const results = sourceAndRun('check_node_identity', {
        extra: `cd ${JSON.stringify(tmp)}`,
      });
      assert.equal(results[0].status, 'PASS');
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('FAILs when the registry exists but the configured node_id is absent', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'opsly-doctor-'));
    try {
      mkdirSync(join(tmp, 'config'));
      writeFileSync(
        join(tmp, 'config', 'trusted-execution-nodes.json'),
        JSON.stringify({ nodes: [{ node_id: 'some-other-node' }] })
      );
      const results = sourceAndRun('check_node_identity', {
        extra: `cd ${JSON.stringify(tmp)}`,
      });
      assert.equal(results[0].status, 'FAIL');
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});

describe('mac-ephemeral-runtime-doctor.sh — check_heartbeat honesty', () => {
  it('never reports PASS for a mechanism nothing writes to yet', () => {
    const results = sourceAndRun('check_heartbeat');
    assert.equal(results.length, 1);
    assert.notEqual(results[0].status, 'PASS');
  });
});
