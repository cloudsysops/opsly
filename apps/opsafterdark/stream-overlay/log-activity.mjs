// Uso: node log-activity.mjs <claude|codex> "texto" | node log-activity.mjs --goal "texto" | node log-activity.mjs --clear
import fs from 'node:fs';
const file = new URL('./activity.json', import.meta.url);
const data = JSON.parse(fs.readFileSync(file, 'utf8'));
const [first, ...rest] = process.argv.slice(2);
if (first === '--clear') data.items = [];
else if (first === '--goal') data.goal = rest.join(' ');
else if (first && rest.length) data.items.push({ tool: first, text: rest.join(' ') });
else { console.log('uso: log-activity.mjs <claude|codex> "texto" | --goal "texto" | --clear'); process.exit(1); }
data.items = data.items.slice(-6);
fs.writeFileSync(file, JSON.stringify(data, null, 2));
console.log(JSON.stringify(data));
