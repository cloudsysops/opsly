#!/usr/bin/env node
import { detectEnvironment } from './environment-detector.js';

const profile = await detectEnvironment();
process.stdout.write(`${JSON.stringify(profile, null, 2)}\n`);
