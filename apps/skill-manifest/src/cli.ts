#!/usr/bin/env node
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { validateAllUserSkills } from "./index.js";

const userSkills = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "skills", "user");

const r = await validateAllUserSkills(userSkills);
for (const s of r.skills) {
  const v = s.version ? ` (${s.version})` : "";
  process.stdout.write(`  ✓ ${s.folder}${v}\n`);
}
if (!r.ok) {
  for (const err of r.errors) {
    process.stderr.write(`  ❌ ${err}\n`);
  }
  process.exit(1);
}
process.stdout.write(`✅ ${r.skills.length} skills en skills/user\n`);
