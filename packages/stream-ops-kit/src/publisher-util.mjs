// Utilidades del publicador. Sin red ni credenciales.

// Quita tokens de cualquier texto antes de guardarlo o mostrarlo.
export function redact(text) {
  return String(text ?? '')
    .replace(/(Bearer\s+)[A-Za-z0-9._~+/=-]+/gi, '$1[redacted]')
    .replace(/((?:access_token|refresh_token|client_secret|code)["'=:\s]+)[A-Za-z0-9._~+/=-]{8,}/gi, '$1[redacted]')
    .slice(0, 300);
}

// La cola guarda rutas de Windows (D:\...); desde WSL son /mnt/d/...
export function toLocalPath(p, platform = process.platform) {
  if (platform === 'win32') return p;
  const m = String(p).match(/^([A-Za-z]):[\\/](.*)$/);
  return m ? `/mnt/${m[1].toLowerCase()}/${m[2].replace(/\\/g, '/')}` : p;
}

// "2026-10-16T19:00" interpretado como hora de pared en `timeZone` -> epoch ms.
// (Misma logica que schedule.mjs; se copia porque schedule.mjs lee la config del tenant al importarse.)
export function zonedToEpoch(local, timeZone) {
  const [, y, mo, d, h, mi] = local.match(/^(\d{4})-(\d\d)-(\d\d)T(\d\d):(\d\d)/).map(Number);
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  const offsetAt = (t) => {
    const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' }).formatToParts(t).map((x) => [x.type, Number(x.value)]));
    return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(t / 1000) * 1000;
  };
  const first = guess - offsetAt(guess);
  return guess - offsetAt(first);
}

export const hashtagsOf = (text) => [...new Set([...String(text ?? '').matchAll(/#([\p{L}\p{N}_]+)/gu)].map((m) => m[1].toLowerCase()))];

// Titulo de Shorts: el pie sin el enlace "Live:" ni hashtags, mas #shorts, maximo 100 caracteres.
export function titleFrom(entry, suffix = ' #shorts') {
  const base = (entry.title ?? String(entry.caption ?? '').split(/\sLive:/)[0]).replace(/#[\p{L}\p{N}_]+/gu, '').trim() || 'Clip de OpsAfterDark';
  return (base.slice(0, 100 - suffix.length) + suffix).trim();
}
