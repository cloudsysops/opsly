#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';

const raw = process.argv.slice(2);
const args = {};
for (let i = 0; i < raw.length; i += 1) {
  if (raw[i].startsWith('--')) args[raw[i].slice(2)] = raw[i + 1];
}

const allowed = new Set([
  'star-paddle',
  'crystal-breaker',
  'nexus-snake',
  'meteor-dodge',
]);

if (!allowed.has(args.template) || !args.slug || !args.title) {
  console.error(
    'Usage: --template star-paddle --slug aurora-paddle --title "Aurora Paddle"',
  );
  process.exit(1);
}

if (!/^[a-z0-9-]+$/.test(args.slug)) {
  console.error('slug must be lowercase kebab-case');
  process.exit(1);
}

const experiment = {
  schemaVersion: 1,
  id: args.slug,
  title: args.title,
  mechanicTemplate: args.template,
  source: 'opsly-original-mechanic-template',
  expressionPolicy: {
    code: 'original',
    art: 'original',
    audio: 'original-or-explicitly-licensed',
    names: 'original',
    thirdPartyGameFiles: false,
  },
  status: 'idea',
};

const root = path.resolve(import.meta.dirname, '../..');
const dir = path.join(root, 'experiments/games', args.slug);
await fs.mkdir(dir, { recursive: true });
await fs.writeFile(
  path.join(dir, 'game.json'),
  JSON.stringify(experiment, null, 2) + '\n',
);

console.log(path.relative(root, path.join(dir, 'game.json')));
