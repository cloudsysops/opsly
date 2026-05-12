#!/usr/bin/env node

/**
 * Autonomous Iteration CLI
 *
 * Monitor and control the autonomous iteration system:
 * - View session state
 * - Check trainer patterns
 * - Trigger manual iterations
 * - Reset sessions
 *
 * Usage:
 *   npx tsx scripts/autonomous-iteration-cli.ts status [job-id]
 *   npx tsx scripts/autonomous-iteration-cli.ts patterns [keyword]
 *   npx tsx scripts/autonomous-iteration-cli.ts history [job-id]
 *   npx tsx scripts/autonomous-iteration-cli.ts reset [job-id]
 *   npx tsx scripts/autonomous-iteration-cli.ts submit <prompt-file>
 */

import { promises as fsp } from 'fs';
import * as path from 'path';
import { IterationOrchestrator } from '../apps/orchestrator/src/lib/iteration/index.js';
import { AgentTrainer } from '../apps/orchestrator/src/lib/training/index.js';

const [, , command, arg1, arg2] = process.argv;

const cursorDir = process.env.CURSOR_DIR || '.cursor';
const orchestrator = new IterationOrchestrator();
const trainer = new AgentTrainer();

async function main() {
  switch (command) {
    case 'status':
      await showStatus(arg1);
      break;

    case 'patterns':
      await showPatterns(arg1);
      break;

    case 'history':
      await showHistory(arg1);
      break;

    case 'reset':
      await resetSession(arg1);
      break;

    case 'submit':
      await submitPrompt(arg1);
      break;

    case 'report':
      await showTrainerReport();
      break;

    default:
      showHelp();
  }
}

async function showStatus(jobId?: string) {
  if (!jobId) {
    console.log('📊 Autonomous Iteration System Status\n');
    console.log('Usage: autonomous-iteration-cli status <job-id>\n');

    // List recent sessions
    try {
      const stateDir = path.join(cursorDir, 'iteration-state');
      const files = await fsp.readdir(stateDir);
      if (files.length === 0) {
        console.log('No sessions found.');
        return;
      }

      console.log(`Recent sessions (${files.length}):\n`);
      for (const file of files.slice(-5)) {
        const data = await fsp.readFile(path.join(stateDir, file), 'utf-8');
        const state = JSON.parse(data);
        console.log(`  Job: ${state.job_id}`);
        console.log(`  Goal: ${state.task_goal}`);
        console.log(`  Status: ${state.status}`);
        console.log(`  Iterations: ${state.current_iteration}/${state.max_iterations}`);
        console.log();
      }
    } catch {
      console.log('No iteration state found.');
    }
    return;
  }

  const state = await orchestrator.getState(jobId);
  if (!state) {
    console.log(`❌ Session not found: ${jobId}`);
    return;
  }

  console.log(`📋 Session: ${state.job_id}\n`);
  console.log(`Goal: ${state.task_goal}`);
  console.log(`Agent: ${state.agent_role}`);
  console.log(`Status: ${state.status}`);
  console.log(`Iterations: ${state.current_iteration}/${state.max_iterations}`);
  console.log(`Started: ${state.started_at}`);
  if (state.completed_at) {
    console.log(`Completed: ${state.completed_at}`);
  }
  console.log();

  if (state.history.length > 0) {
    console.log('📜 Execution History:\n');
    state.history.forEach((h, i) => {
      console.log(`  [${i + 1}] ${h.timestamp}`);
      console.log(`      Duration: ${h.duration_ms}ms`);
      console.log(`      Result: ${h.result.slice(0, 60)}...`);
      console.log();
    });
  }
}

async function showPatterns(keyword?: string) {
  const patterns = keyword ? await trainer.getPatternsFor(keyword) : (await trainer.generatePatterns()).patterns;

  console.log(`📈 Agent Patterns${keyword ? ` (${keyword})` : ''}\n`);

  if (patterns.length === 0) {
    console.log('No patterns found. Run more executions to generate patterns.');
    return;
  }

  patterns.forEach((p) => {
    console.log(`Agent: ${p.agent_role}`);
    console.log(`Pattern: ${p.task_pattern}`);
    console.log(`Success Rate: ${(p.success_rate * 100).toFixed(1)}%`);
    console.log(`Avg Iterations: ${p.avg_iterations.toFixed(1)}`);
    console.log(`Avg Duration: ${p.avg_duration_ms.toFixed(0)}ms`);
    if (p.common_errors.length > 0) {
      console.log(`Common Errors: ${p.common_errors.join(', ')}`);
    }
    if (p.typical_sequence.length > 0) {
      console.log(`Typical Sequence: ${p.typical_sequence.join(' → ')}`);
    }
    console.log();
  });
}

async function showHistory(jobId?: string) {
  if (!jobId) {
    console.log('Usage: autonomous-iteration-cli history <job-id>');
    return;
  }

  const history = await orchestrator.getHistory(jobId);
  if (!history) {
    console.log(`❌ History not found for: ${jobId}`);
    return;
  }

  console.log(`📜 History for ${jobId}\n`);
  history.forEach((entry, i) => {
    console.log(`[Iteration ${entry.iteration}]`);
    console.log(`  Timestamp: ${entry.timestamp}`);
    console.log(`  Duration: ${entry.duration_ms}ms`);
    console.log(`  Prompt: ${entry.prompt.slice(0, 50)}...`);
    console.log(`  Result: ${entry.result.slice(0, 50)}...`);
    console.log();
  });
}

async function resetSession(jobId?: string) {
  if (!jobId) {
    console.log('Usage: autonomous-iteration-cli reset <job-id>');
    return;
  }

  const stateDir = path.join(cursorDir, 'iteration-state');
  const filepath = path.join(stateDir, `${jobId}.json`);

  try {
    await fsp.unlink(filepath);
    console.log(`✅ Session reset: ${jobId}`);
  } catch {
    console.log(`❌ Session not found: ${jobId}`);
  }
}

async function submitPrompt(filePath?: string) {
  if (!filePath) {
    console.log('Usage: autonomous-iteration-cli submit <prompt-file>');
    return;
  }

  try {
    const content = await fsp.readFile(filePath, 'utf-8');
    console.log(`📤 Would submit: ${filePath}`);
    console.log(`Content:\n${content.slice(0, 200)}...`);
    // TODO: Implement actual submission
  } catch {
    console.log(`❌ File not found: ${filePath}`);
  }
}

async function showTrainerReport() {
  const report = await trainer.generatePatterns();

  console.log(`📊 Trainer Report\n`);
  console.log(`Generated: ${report.generated_at}`);
  console.log(`Total Executions: ${report.total_executions}`);
  console.log(`Patterns Found: ${report.patterns.length}\n`);

  if (report.patterns.length > 0) {
    console.log('Top Patterns:\n');
    report.patterns.slice(0, 5).forEach((p) => {
      console.log(`  ${p.agent_role} / ${p.task_pattern}`);
      console.log(`    Success: ${(p.success_rate * 100).toFixed(1)}% | Speed: ${(p.avg_duration_ms / 1000).toFixed(1)}s`);
    });
  }

  if (Object.keys(report.improvements).length > 0) {
    console.log('\nAgent Improvements:\n');
    Object.entries(report.improvements).forEach(([agent, metrics]: any) => {
      console.log(`  ${agent}`);
      console.log(`    Success Rate: ${metrics.success_rate_trend}`);
      console.log(`    Speed: ${metrics.speed_improvement}`);
      console.log(`    Quality: ${metrics.quality_score.toFixed(2)}`);
    });
  }
}

function showHelp() {
  console.log(`
Autonomous Iteration CLI

Commands:
  status [job-id]       Show session status or list recent sessions
  patterns [keyword]    Show learned patterns (optionally filtered by keyword)
  history <job-id>      Show execution history for a session
  reset <job-id>        Reset a session (remove state file)
  submit <file>         Submit a prompt file for execution
  report                Show trainer report with patterns and improvements

Environment:
  CURSOR_DIR            Path to .cursor directory (default: .cursor)

Examples:
  npx tsx scripts/autonomous-iteration-cli.ts status
  npx tsx scripts/autonomous-iteration-cli.ts patterns api
  npx tsx scripts/autonomous-iteration-cli.ts history job-123
  npx tsx scripts/autonomous-iteration-cli.ts report
  `);
}

main().catch(console.error);
