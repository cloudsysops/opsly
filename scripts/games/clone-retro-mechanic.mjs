#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'../..');
const cfg=JSON.parse(await fs.readFile(path.join(root,'config/games/retro-originals.json'),'utf8'));
const args=process.argv.slice(2);
const value=(flag)=>{const i=args.indexOf(flag);return i>=0?args[i+1]:null;};
const source=value('--source');
const slug=value('--slug');
const title=value('--title');
if(!source||!slug||!title){
  console.error('Usage: node scripts/games/clone-retro-mechanic.mjs --source star-paddle --slug aurora-orbit --title "Aurora Orbit"');
  process.exit(2);
}
const template=cfg.templates.find(x=>x.id===source);
if(!template){console.error('Unknown template: '+source);process.exit(2);}
const proposal={
  schemaVersion:1,
  id:slug,
  title,
  derivedFromMechanic:template.id,
  mechanicFamily:template.mechanicFamily,
  status:'idea',
  assetPolicy:'new-original-assets-only',
  ipPolicy:'do-not-copy-third-party-characters-names-music-levels-or-sprites',
  canonBinding:null,
  createdAt:new Date().toISOString()
};
console.log(JSON.stringify(proposal,null,2));
