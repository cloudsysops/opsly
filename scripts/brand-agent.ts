#!/usr/bin/env node
import { runBrandAgentCli } from '../lib/brand-agent/src/index.js';

runBrandAgentCli(process.argv.slice(2)).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`brand-agent: ${message}`);
  process.exitCode = 1;
});

