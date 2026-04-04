export function relativeTime(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) {
    return iso;
  }
  const sec = Math.floor((Date.now() - t) / 1000);
  if (sec < 5) {
    return "hace un momento";
  }
  if (sec < 60) {
    return `hace ${sec}s`;
  }
  const min = Math.floor(sec / 60);
  if (min < 60) {
    return `hace ${min} min`;
  }
  const h = Math.floor(min / 60);
  if (h < 48) {
    return `hace ${h} h`;
  }
  const d = Math.floor(h / 24);
  return `hace ${d} d`;
}
