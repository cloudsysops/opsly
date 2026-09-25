"""Brain del setlist: mezcla armónica (rueda Camelot) + energía por BPM.

El agente elige pistas deterministas: semilla fija (config `setlist.seed`),
compatibilidad armónica y progresión de energía. No requiere LLM: corre 100%
local. Para un negocio "100% automático" se puede conectar a un LLM vía
LLM Gateway, pero la lógica base no debe depender de red.
"""
import random

# Clave musical -> Camelot (tabla Mixed In Key).
MUSICAL_TO_CAMELOT = {
    "Abm": "1A", "Ab m": "1A", "Ebm": "2A", "Eb m": "2A",
    "Bbm": "3A", "Bb m": "3A", "Fm": "4A", "F m": "4A",
    "Cm": "5A", "C m": "5A", "Gm": "6A", "G m": "6A",
    "Dm": "7A", "D m": "7A", "Am": "8A", "A m": "8A",
    "Em": "9A", "E m": "9A", "Bm": "10A", "B m": "10A",
    "F#m": "11A", "F# m": "11A", "C#m": "12A", "C# m": "12A", "Dbm": "12A",
    "Ab": "1B", "Eb": "2B", "Bb": "3B", "F": "4B",
    "C": "5B", "G": "6B", "D": "7B", "A": "8B",
    "E": "9B", "B": "10B", "F#": "11B", "C#": "12B",
    "Db": "12B", "Gb": "11B",
}


def normalize_key(value: str) -> str:
    value = (value or "").strip()
    if not value:
        return ""
    low = value.lower()
    if low[:1].isdigit() and low[-1:] in ("a", "b"):
        return value.upper()
    parts = value.split()
    if len(parts) >= 2 and parts[0] in ("A", "B", "C", "D", "E", "F", "G"):
        short = value.replace(" minor", "m").lower().replace("major", "").replace(" ", "")
        return MUSICAL_TO_CAMELOT.get(short.capitalize(), "")
    return MUSICAL_TO_CAMELOT.get(value, "")


def _wrap_hour(hour: int) -> int:
    return ((hour - 1) % 12) + 1


def camelot_neighbors(code: str) -> set[str]:
    if not code:
        return set()
    hour = int(code[:-1])
    mood = code[-1].upper()
    opposite = "B" if mood == "A" else "A"
    return {f"{_wrap_hour(hour - 1)}{mood}", f"{_wrap_hour(hour + 1)}{mood}", f"{hour}{opposite}"}


def harmonic_score(a: str, b: str) -> float:
    a = normalize_key(a)
    b = normalize_key(b)
    if not a or not b:
        return 0.0
    if a == b:
        return 1.0
    if a in camelot_neighbors(b):
        return 0.8
    return 0.0


def _energy(track: dict, min_bpm: float, max_bpm: float) -> float:
    bpm = track.get("bpm")
    if not isinstance(bpm, (int, float)) or not bpm:
        return 0.5
    span = max(1.0, max_bpm - min_bpm)
    return (bpm - min_bpm) / span


def plan_next(
    tracks: list[dict],
    last_key: str = "",
    last_bpm: float = 124.0,
    count: int = 3,
    energy: str = "up",
    seed: int | None = None,
    bpm_tolerance_pct: float = 8.0,
    max_bpm_delta_pct: float = 15.0,
) -> list[dict]:
    usable = [t for t in tracks if isinstance(t.get("bpm"), (int, float))]
    if not usable:
        return []
    usable = [t for t in usable
              if abs(t["bpm"] - last_bpm) / max(1.0, last_bpm) * 100 <= max_bpm_delta_pct]
    usable = [t for t in usable
              if abs(t["bpm"] - last_bpm) / max(1.0, last_bpm) * 100 <= bpm_tolerance_pct] or usable
    if not usable:
        return []

    rng = random.Random(seed)
    rng.shuffle(usable)
    last_key = normalize_key(last_key)
    min_bpm = min(t["bpm"] for t in usable)
    max_bpm = max(t["bpm"] for t in usable)

    def rank(t: dict) -> tuple:
        harm = harmonic_score(last_key, str(t.get("key", "")))
        closeness = 1.0 - min(1.0, abs(t["bpm"] - last_bpm) / max(1.0, last_bpm * 0.08))
        e = _energy(t, min_bpm, max_bpm)
        if energy == "up":
            e_score = e
        elif energy == "down":
            e_score = 1.0 - e
        else:
            e_score = 0.5 - abs(e - 0.5)
        return (harm, closeness + e_score)

    ordered = sorted(usable, key=rank, reverse=True)
    return ordered[:count]


def status(tracks: list[dict]) -> dict:
    bpm = [t["bpm"] for t in tracks if isinstance(t.get("bpm"), (int, float))]
    with_key = [t for t in tracks if normalize_key(str(t.get("key", "")))]
    return {
        "tracks_con_bpm": len(bpm),
        "tracks_con_key_camelot": len(with_key),
        "bpm_mid": round(sorted(bpm)[len(bpm) // 2], 2) if bpm else None,
        "notas": "sube el SDT de energía hacia arriba con 'up' y cierra con 'down'",
    }