import fs from 'node:fs/promises';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'../..');
const policy=JSON.parse(await fs.readFile(path.join(root,'config/games/retro-lab-license-policy.json'),'utf8'));
const originals=JSON.parse(await fs.readFile(path.join(root,'config/games/retro-originals.json'),'utf8'));
const errors=[];

if(policy.defaultDecision!=='deny') errors.push('license policy must default-deny');
if(policy.contentPolicy?.serverStorage!==false) errors.push('emulator ROMs must not be stored server-side in v1');

const allowedLicenses=new Set(['GPL-2.0','GPL-3.0','MPL-2.0','MIT','BSD-2-Clause','BSD-3-Clause','CC0','Public-Domain','Unlicense']);
for(const entry of policy.allowedSystems||[]){
  if(!allowedLicenses.has(entry.license)) errors.push(`unapproved core license: ${entry.core} ${entry.license}`);
  if((policy.explicitlyBlockedCores||[]).some(block=>block.core===entry.core)) errors.push(`core is both allowed and blocked: ${entry.core}`);
}
for(const game of originals.templates||[]){
  if(game.license!=='Opsly-original') errors.push(`retro original must be owned/original: ${game.id}`);
  if(game.cloneable!==true) errors.push(`retro original must be cloneable: ${game.id}`);
}
if(new Set(originals.templates.map(g=>g.id)).size!==originals.templates.length) errors.push('duplicate retro original id');

if(errors.length){
  console.error('Retro Games Lab license validation failed:');
  for(const e of errors) console.error('- '+e);
  process.exit(1);
}
console.log(`Retro Games Lab licenses: OK · ${policy.allowedSystems.length} emulator systems · ${originals.templates.length} original cloneable mechanics`);
