import { validatePatternIndex, listPatterns } from '../lib/pattern-catalog/src/index.ts';

const errors = validatePatternIndex();
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

const counts = { harness: 0, tenant: 0, opsly: 0 };
for (const kind of ['harness', 'tenant', 'opsly'] as const) {
  counts[kind] = listPatterns(kind).length;
}
console.log('Pattern catalog OK:', JSON.stringify(counts));
