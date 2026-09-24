"""Lector de la librería de Serato Pro (formato `database V2`).

Best-effort:
  1. Si `serato_tools` está instalado, se delega en él.
  2. Si no, parser binario mínimo: registros `<4B tag><u32be len><data>`;
     dentro de cada `otrk` se leen `pfil`/`tttl`/`part` (path UTF-16BE
     prefijado por u16be) y `bpm` (float big-endian).
  3. Alternativa: snapshot JSON (config `serato.library_json`) con la forma
     `{"tracks": [{"title","artist","bpm","key","path"}]}`.
Ningún error de parseo interrumpe la carga: los registros ilegibles se omiten.
"""
import json
import struct

try:
    import serato_tools  # type: ignore  # noqa: F401
    _HAS_SERATO_TOOLS = True
except Exception:  # pragma: no cover
    _HAS_SERATO_TOOLS = False


class LibraryError(RuntimeError):
    pass


def _read_records(data: bytes):
    """Itera (tag, payload) del flujo binario Serato.

    Los registros son `<tag ASCII><u32be length><data>`. El tag se escanea
    como una ristra de letras A-Za-z (los tags reales son variables: pfil,
    tttl, part, bpm, pkey...) hasta el primer byte no-letra (el inicio del
    campo de longitud, típicamente 0x00). Robustez ante datos corruptos:
    cualquier tag ilegal o longitud fuera de rango corta la iteración.
    """
    pos = 0
    n = len(data)
    while pos + 4 <= n:
        start = pos
        while pos < n and (65 <= data[pos] <= 90 or 97 <= data[pos] <= 122):
            pos += 1
        if pos == start or pos + 4 > n:
            break
        (length,) = struct.unpack(">I", data[pos:pos + 4])
        pos += 4
        if length > n - pos:
            break
        yield data[start:pos - 4].decode("latin1"), data[pos:pos + length]
        pos += length


def _utf16(data: bytes) -> str | None:
    if len(data) < 2:
        return None
    (ln,) = struct.unpack(">H", data[:2])
    payload = data[2:2 + ln * 2]
    try:
        return payload.decode("utf-16-be")
    except Exception:  # noqa: BLE001
        return None


def _parse_track(payload: bytes) -> dict | None:
    track: dict = {}
    for tag, sub in _read_records(payload):
        if tag == "pfil" and "path" not in track:
            v = _utf16(sub)
            if v:
                track["path"] = v
        elif tag == "tttl" and "title" not in track:
            v = _utf16(sub)
            if v:
                track["title"] = v
        elif tag == "part" and "artist" not in track:
            v = _utf16(sub)
            if v:
                track["artist"] = v
        elif tag == "bpm" and len(sub) >= 4:
            try:
                track["bpm"] = round(struct.unpack(">f", sub[:4])[0], 2)
            except Exception:  # noqa: BLE001
                pass
        elif tag == "pkey":
            track["key_raw"] = sub.hex()
    tracks_ok = "title" in track or "path" in track
    if not tracks_ok:
        return None
    return {
        "title": track.get("title", ""),
        "artist": track.get("artist", ""),
        "path": track.get("path", ""),
        "bpm": track.get("bpm"),
        "key": track.get("key_raw", ""),
        "key_raw": track.get("key_raw", ""),
        "filename": (track.get("path", "") or "").rsplit("/", 1)[-1],
    }


def _parse_database(data: bytes) -> list[dict]:
    tracks = []
    for tag, payload in _read_records(data):
        if tag == "otrk":
            t = _parse_track(payload)
            if t:
                tracks.append(t)
    return tracks


def load_from_file(path: str) -> list[dict]:
    try:
        data = open(path, "rb").read()
    except OSError as exc:
        raise LibraryError(f"no se pudo leer {path}: {exc}") from exc
    tracks = _parse_database(data)
    if tracks:
        return tracks
    if _HAS_SERATO_TOOLS:
        try:
            parsed = serato_tools.parse_file(path)  # best-effort
            if isinstance(parsed, list) and parsed:
                return [t for t in parsed if isinstance(t, dict)]
        except Exception:  # pragma: no cover - API variable
            pass
    raise LibraryError("sin pistas parseadas (¿el archivo es `database V2`?)")


def load_library(db_path: str, json_path: str = "") -> list[dict]:
    if json_path:
        try:
            payload = json.load(open(json_path, encoding="utf-8"))
            tracks = payload.get("tracks") if isinstance(payload, dict) else payload
            if isinstance(tracks, list):
                return [t for t in tracks if isinstance(t, dict)]
        except OSError as exc:
            raise LibraryError(f"no se pudo leer {json_path}: {exc}") from exc
    return load_from_file(db_path)


def stats(tracks: list[dict]) -> dict:
    con_bpm = [t for t in tracks if isinstance(t.get("bpm"), (int, float))]
    return {
        "total": len(tracks),
        "con_bpm": len(con_bpm),
        "bpm_min": round(min((t["bpm"] for t in con_bpm), default=0), 2),
        "bpm_max": round(max((t["bpm"] for t in con_bpm), default=0), 2),
        "con_key": len([t for t in tracks if t.get("key")]),
        "html": bool(_HAS_SERATO_TOOLS),
    }