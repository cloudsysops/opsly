import fs from 'node:fs';

const file = new URL('./schedule.json', import.meta.url);
let testEnd = null; // epoch ms; solo en memoria, nunca toca schedule.json

// "2026-10-03T20:00" interpretado como hora de pared en `timeZone` -> epoch ms.
function zonedToEpoch(local, timeZone) {
  const [, y, mo, d, h, mi] = local.match(/^(\d{4})-(\d\d)-(\d\d)T(\d\d):(\d\d)/).map(Number);
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  const offsetAt = (t) => {
    const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' }).formatToParts(t).map((x) => [x.type, Number(x.value)]));
    return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(t / 1000) * 1000;
  };
  const first = guess - offsetAt(guess);
  return guess - offsetAt(first);
}

export function setTest(seconds) { testEnd = seconds > 0 ? Date.now() + seconds * 1000 : null; }

export function schedule() {
  const cfg = JSON.parse(fs.readFileSync(file, 'utf8'));
  const target = testEnd ?? zonedToEpoch(cfg.at, cfg.timezone);
  const label = new Intl.DateTimeFormat('es-US', { timeZone: cfg.timezone, weekday: 'long', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit' }).format(target);
  return { now: Date.now(), target, remaining: Math.ceil((target - Date.now()) / 1000), test: testEnd !== null, scene: cfg.scene, timezone: cfg.timezone, label };
}
