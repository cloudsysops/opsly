#!/usr/bin/env node
// oad — Ops After Dark allowlisted OBS scene-control adapter.
//
// Canonical design: docs/streaming/REMOTE-STREAM-CONTROL.md
//
// Minimal surface, nothing else:
//
//     oad status
//     oad scene gaming|coding|factory|intermission|starting [--dry-run]
//
// Deliberately does NOT:
//   - accept a scene name outside the allowlist (fails closed before ever
//     touching OBS — alias resolution is a pure function, unit tested);
//   - expose StartStream/StopStream, the stream key, or any source mutation
//     other than the current program scene (those subcommands simply do not
//     exist here — see stream-ops-stream-ctl for the local-operator tool
//     that still has them);
//   - print or log the OBS WebSocket password (obs-connection.mjs never
//     logs the parsed config; this file never touches it directly);
//   - open a listener or expose obs-websocket beyond its existing bind —
//     this is a client, run locally or over SSH/Tailscale into this host.
import { withObs, scenes } from './obs.mjs';
import {
  ALIASES,
  EXIT_OK,
  EXIT_UNKNOWN_SCENE,
  EXIT_SCENE_NOT_CONFIGURED,
  EXIT_OBS_UNREACHABLE,
  EXIT_PHYSICAL_SCENE_MISSING,
  EXIT_READBACK_MISMATCH,
  resolveAlias,
} from './oad-scenes.mjs';

export { ALIASES, resolveAlias };

async function runStatus() {
  await withObs(async (req) => {
    const current = (await req('GetCurrentProgramScene')).currentProgramSceneName;
    const streaming = (await req('GetStreamStatus')).outputActive;
    console.log(`CURRENT_SCENE=${current}`);
    console.log(`STREAMING=${streaming}`);
  });
}

async function runScene(word, { dryRun }) {
  const { logical, tenantKey } = resolveAlias(word); // throws RangeError, caller maps to EXIT_UNKNOWN_SCENE

  if (!tenantKey) {
    const err = new Error(`${logical} has no physical scene mapped yet`);
    err.oadExit = EXIT_SCENE_NOT_CONFIGURED;
    throw err;
  }

  const physical = scenes[tenantKey];
  if (!physical) {
    const err = new Error(`tenant obsSceneNames has no "${tenantKey}" entry`);
    err.oadExit = EXIT_SCENE_NOT_CONFIGURED;
    throw err;
  }

  await withObs(async (req) => {
    const sceneList = (await req('GetSceneList')).scenes.map((s) => s.sceneName);
    if (!sceneList.includes(physical)) {
      const err = new Error(`${JSON.stringify(physical)} not found in current OBS scene collection`);
      err.oadExit = EXIT_PHYSICAL_SCENE_MISSING;
      throw err;
    }

    const before = (await req('GetCurrentProgramScene')).currentProgramSceneName;

    if (dryRun) {
      console.log('DRY_RUN=true');
      console.log(`LOGICAL_SCENE=${logical}`);
      console.log(`PHYSICAL_SCENE=${physical}`);
      console.log(`CURRENT_SCENE=${before}`);
      console.log('NO_MUTATION_PERFORMED=true');
      return;
    }

    await req('SetCurrentProgramScene', { sceneName: physical });
    const after = (await req('GetCurrentProgramScene')).currentProgramSceneName;

    console.log(`LOGICAL_SCENE=${logical}`);
    console.log(`PHYSICAL_SCENE=${physical}`);
    console.log(`READBACK_SCENE=${after}`);

    if (after !== physical) {
      const err = new Error(`requested ${JSON.stringify(physical)}, OBS reports ${JSON.stringify(after)}`);
      err.oadExit = EXIT_READBACK_MISMATCH;
      throw err;
    }
    console.log('SWITCH_CONFIRMED=true');
  });
}

async function main(argv) {
  const [cmd, arg, flag] = argv;

  if (cmd === 'status') {
    try {
      await runStatus();
      return EXIT_OK;
    } catch (err) {
      console.error(`OAD_ERROR=OBS_UNREACHABLE: ${err.message}`);
      return EXIT_OBS_UNREACHABLE;
    }
  }

  if (cmd === 'scene') {
    const dryRun = arg === '--dry-run' || flag === '--dry-run';
    try {
      await runScene(arg, { dryRun });
      return EXIT_OK;
    } catch (err) {
      if (err instanceof RangeError) {
        console.error(`OAD_ERROR=UNKNOWN_SCENE: ${JSON.stringify(arg)} (allowed: ${Object.keys(ALIASES).join(', ')})`);
        return EXIT_UNKNOWN_SCENE;
      }
      if (err.oadExit) {
        console.error(`OAD_ERROR=${err.oadExit === EXIT_SCENE_NOT_CONFIGURED ? 'SCENE_NOT_CONFIGURED' : err.oadExit === EXIT_PHYSICAL_SCENE_MISSING ? 'PHYSICAL_SCENE_MISSING' : 'READBACK_MISMATCH'}: ${err.message}`);
        return err.oadExit;
      }
      console.error(`OAD_ERROR=OBS_UNREACHABLE: ${err.message}`);
      return EXIT_OBS_UNREACHABLE;
    }
  }

  console.error(`uso: oad status | oad scene <${Object.keys(ALIASES).join('|')}> [--dry-run]`);
  return EXIT_UNKNOWN_SCENE;
}

// No import-guard idiom here: nothing else imports this file (tests import
// the dependency-free oad-scenes.mjs instead), and a path-string entry-point
// check breaks cross-platform anyway (argv[1] uses OS-native separators,
// import.meta.url never does — that mismatch silently no-ops on Windows).
main(process.argv.slice(2)).then((code) => process.exit(code));
