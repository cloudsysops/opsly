// Extrae las pistas de audio AAC de un MP4 de OBS (incluye "hybrid MP4") a .aac (ADTS) en .analysis/
//   node extract-audio-tracks.mjs "D:\Content\Media\OBS\archivo.mp4"
// Sin dependencias externas. Solo lee el archivo; escribe únicamente en .analysis/.
import fs from 'node:fs';
import path from 'node:path';
import { tenantPath } from './tenant-paths.mjs';

const file = process.argv[2];
if (!file) { console.log('uso: extract-audio-tracks.mjs <archivo.mp4>'); process.exit(1); }
const fd = fs.openSync(file, 'r');
const size = fs.fstatSync(fd).size;
const read = (pos, len) => { const b = Buffer.alloc(len); fs.readSync(fd, b, 0, len, pos); return b; };

function boxes(buf, start = 0, end = buf.length) {
  const out = [];
  for (let p = start; p + 8 <= end;) {
    let len = buf.readUInt32BE(p); const type = buf.toString('latin1', p + 4, p + 8); let head = 8;
    if (len === 1) { len = Number(buf.readBigUInt64BE(p + 8)); head = 16; } else if (len === 0) len = end - p;
    if (len < head) break;
    out.push({ type, start: p, body: p + head, end: Math.min(p + len, end) });
    p += len;
  }
  return out;
}
const child = (buf, box, type) => boxes(buf, box.body, box.end).find((b) => b.type === type);
const children = (buf, box, type) => boxes(buf, box.body, box.end).filter((b) => b.type === type);

// Cajas de nivel superior directamente del archivo (moov puede ser grande; mdat no se carga).
const top = [];
for (let p = 0; p + 8 <= size;) {
  const h = read(p, 16); let len = h.readUInt32BE(0); const type = h.toString('latin1', 4, 8);
  if (len === 1) len = Number(h.readBigUInt64BE(8)); else if (len === 0) len = size - p;
  top.push({ type, start: p, len }); if (len < 8) break; p += len;
}
console.log('cajas:', top.map((b) => `${b.type}(${b.len})`).slice(0, 12).join(' '), top.length > 12 ? `… +${top.length - 12}` : '');
const moovBox = top.filter((b) => b.type === 'moov').pop();
if (!moovBox) throw new Error('sin moov: ¿grabación sin finalizar?');
const moov = read(moovBox.start, moovBox.len);
const moovTop = boxes(moov)[0];

const tracks = [];
for (const trak of children(moov, moovTop, 'trak')) {
  const mdia = child(moov, trak, 'mdia'); const hdlr = child(moov, mdia, 'hdlr');
  if (moov.toString('latin1', hdlr.body + 8, hdlr.body + 12) !== 'soun') continue;
  const tkhd = child(moov, trak, 'tkhd'); const trackId = moov.readUInt32BE(tkhd.body + (moov[tkhd.body] === 1 ? 20 : 12));
  const stbl = child(moov, child(moov, mdia, 'minf'), 'stbl'); const stsd = child(moov, stbl, 'stsd');
  const mp4a = boxes(moov, stsd.body + 8, stsd.end)[0];
  const channels = moov.readUInt16BE(mp4a.body + 16);
  const esds = boxes(moov, mp4a.body + 28, mp4a.end).find((b) => b.type === 'esds');
  // busca el DecoderSpecificInfo (tag 0x05) dentro del esds
  let asc = null;
  for (let i = esds.body + 4; i < esds.end - 2; i++) if (moov[i] === 0x05) { let j = i + 1, l = 0; for (;;) { const c = moov[j++]; l = (l << 7) | (c & 0x7f); if (!(c & 0x80)) break; } asc = moov.subarray(j, j + l); break; }
  const objectType = asc[0] >> 3; const sfi = ((asc[0] & 7) << 1) | (asc[1] >> 7); const chCfg = (asc[1] >> 3) & 15;
  tracks.push({ trackId, objectType, sfi, chCfg, channels, stbl, samples: [] });
}
console.log(`pistas de audio: ${tracks.length}`);

// Tablas de muestras (mp4 normal / hybrid finalizado) ---------------------------------------
for (const t of tracks) {
  const stsz = child(moov, t.stbl, 'stsz'); const stsc = child(moov, t.stbl, 'stsc');
  const stco = child(moov, t.stbl, 'stco'); const co64 = child(moov, t.stbl, 'co64');
  if (!stsz) continue;
  const fixed = moov.readUInt32BE(stsz.body + 4); const count = moov.readUInt32BE(stsz.body + 8);
  const sizes = Array.from({ length: count }, (_, i) => fixed || moov.readUInt32BE(stsz.body + 12 + i * 4));
  const offsets = []; const cb = stco ?? co64;
  if (cb) { const n = moov.readUInt32BE(cb.body + 4); for (let i = 0; i < n; i++) offsets.push(stco ? moov.readUInt32BE(cb.body + 8 + i * 4) : Number(moov.readBigUInt64BE(cb.body + 8 + i * 8))); }
  const runs = []; const n = stsc ? moov.readUInt32BE(stsc.body + 4) : 0;
  for (let i = 0; i < n; i++) runs.push({ first: moov.readUInt32BE(stsc.body + 8 + i * 12), per: moov.readUInt32BE(stsc.body + 12 + i * 12) });
  let s = 0;
  offsets.forEach((off, ci) => {
    const run = [...runs].reverse().find((r) => r.first <= ci + 1); let pos = off;
    for (let k = 0; k < (run?.per ?? 0) && s < count; k++, s++) { t.samples.push([pos, sizes[s]]); pos += sizes[s]; }
  });
}
// Fragmentos moof/traf/trun (por si la grabación es fMP4 sin finalizar) ---------------------
if (tracks.some((t) => t.samples.length === 0)) {
  for (const f of top.filter((b) => b.type === 'moof')) {
    const moof = read(f.start, f.len); const mt = boxes(moof)[0];
    for (const traf of children(moof, mt, 'traf')) {
      const tfhd = child(moof, traf, 'tfhd'); const id = moof.readUInt32BE(tfhd.body + 4); const t = tracks.find((x) => x.trackId === id); if (!t) continue;
      const tf = moof.readUInt32BE(tfhd.body) & 0xffffff; let q = tfhd.body + 8; let base = f.start; let defSize = 0;
      if (tf & 1) { base = Number(moof.readBigUInt64BE(q)); q += 8; } if (tf & 2) q += 4; if (tf & 8) q += 4; if (tf & 0x10) { defSize = moof.readUInt32BE(q); q += 4; }
      for (const trun of children(moof, traf, 'trun')) {
        const fl = moof.readUInt32BE(trun.body) & 0xffffff; const cnt = moof.readUInt32BE(trun.body + 4); let r = trun.body + 8; let pos = base;
        if (fl & 1) { pos = base + moof.readInt32BE(r); r += 4; } if (fl & 4) r += 4;
        for (let i = 0; i < cnt; i++) { if (fl & 0x100) r += 4; let sz = defSize; if (fl & 0x200) { sz = moof.readUInt32BE(r); r += 4; } if (fl & 0x400) r += 4; if (fl & 0x800) r += 4; t.samples.push([pos, sz]); pos += sz; }
      }
    }
  }
}

fs.mkdirSync(tenantPath('.analysis'), { recursive: true });
const srTable = [96000, 88200, 64000, 48000, 44100, 32000, 24000, 22050, 16000, 12000, 11025, 8000, 7350];
const meta = [];
tracks.forEach((t, i) => {
  const chunks = t.samples.map(([pos, len]) => {
    const total = len + 7; const h = Buffer.alloc(7);
    h[0] = 0xff; h[1] = 0xf1; h[2] = ((t.objectType - 1) << 6) | (t.sfi << 2) | (t.chCfg >> 2); h[3] = ((t.chCfg & 3) << 6) | (total >> 11); h[4] = (total >> 3) & 0xff; h[5] = ((total & 7) << 5) | 0x1f; h[6] = 0xfc;
    return Buffer.concat([h, read(pos, len)]);
  });
  fs.writeFileSync(path.join(tenantPath('.analysis'), `track${i + 1}.aac`), Buffer.concat(chunks));
  meta.push({ track: i + 1, trackId: t.trackId, frames: t.samples.length, sampleRate: srTable[t.sfi], channels: t.chCfg || t.channels, seconds: +(t.samples.length * 1024 / srTable[t.sfi]).toFixed(1) });
});
fs.writeFileSync(path.join(tenantPath('.analysis'), 'meta.json'), JSON.stringify(meta));
console.log(JSON.stringify(meta));
fs.closeSync(fd);
