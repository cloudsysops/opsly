import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateAllUserSkills } from './load.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const userSkills = join(root, 'skills', 'user');

const r = validateAllUserSkills(userSkills);
for (const s of r.skills) {
  const v = s.version ? ` (${s.version})` : '';
  console.log(`  ✓ ${s.folder}${v}`);
}
if (!r.ok) {
  for (const e of r.errors) {
    console.error(`  ✗ ${e}`);
  }
  process.exit(1);
}
console.log(`✅ ${r.skills.length} skills en skills/user`);
