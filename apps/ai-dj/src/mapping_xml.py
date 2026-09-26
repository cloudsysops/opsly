"""Generador del mapping MIDI custom de Serato DJ Pro para el AI DJ.

Serato carga mappings como XML en `~/Music/_Serato_/MIDI/Xml/`. El canal
1-indexado elige el deck (1=A, 2=B...; 8=mixer). Cada `<binding>` asocia una
acción Serato a un mensaje MIDI (note / cc).

IMPORTANTE: los tokens de función (p. ej. PLAY, CUE_HOT_START_1, CROSSFADER_POS)
deben validarse en Serato (Setup -> MIDI -> edit XML). Si Serato no reconoce un
token, el botón aparece sin función asignable: se ajusta solo en `function_map`.
"""
import os
from xml.sax.saxutils import escape

# Acción -> token de función de Serato DJ Pro (best-effort, validar en Serato).
FUNCTION_MAP = {
    "play": "PLAY",
    "cue": "CUE",
    "sync": "SYNC",
    "back": "BACK",
    "fwd": "FWD",
    "load": "LOAD",
    "tempo_up": "TEMPO_UP",
    "tempo_down": "TEMPO_DOWN",
    "loop": "LOOP",
    "fx_on_off": "FX_ON_OFF_1",
    "hotcue_start_1": "CUE_HOT_START_1",
    "hotcue_start_2": "CUE_HOT_START_2",
    "hotcue_start_3": "CUE_HOT_START_3",
    "hotcue_start_4": "CUE_HOT_START_4",
}


def _control_xml(channel: int, mtype: str, number: int, function: str) -> str:
    return (
        f'\n  <control channel="{channel}" type="{mtype}" number="{number}">'
        f'\n    <userio direction="in">'
        f'\n      <binding type="note" function="{escape(function)}" />'
        f"\n    </userio>"
        f"\n  </control>"
    )


def generate(deck_channels=("A", "B"), notes: dict | None = None, crossfader_cc: int = 84) -> str:
    notes = notes or {}
    body: list[str] = []
    for deck in deck_channels:
        channel = deck_channels.index(deck) + 1
        for action, note_num in [
            ("play", notes.get("play", 88)),
            ("cue", notes.get("cue", 89)),
            ("sync", notes.get("sync", 90)),
            ("back", notes.get("back", 91)),
            ("fwd", notes.get("fwd", 92)),
            ("load", notes.get("load", 93)),
            ("tempo_up", notes.get("tempo_up", 97)),
            ("tempo_down", notes.get("tempo_down", 98)),
            ("loop", notes.get("loop", 95)),
            ("fx_on_off", notes.get("fx_on_off", 96)),
        ]:
            body.append(_control_xml(channel, "note", note_num, FUNCTION_MAP[action]))
        hot_base = int(notes.get("hotcue", 94))
        for slot in range(1, 5):
            body.append(_control_xml(channel, "note", hot_base + slot - 1, FUNCTION_MAP[f"hotcue_start_{slot}"]))
    body.append(
        f'\n  <control channel="8" type="cc" number="{crossfader_cc}">'
        f'\n    <userio direction="in">'
        f'\n      <binding type="abs" function="CROSSFADER_POS" />'
        f"\n    </userio>"
        f"\n  </control>"
    )
    return "<midi>" + "".join(body) + "\n</midi>\n"


def install(xml_dir: str, xml_text: str, filename: str = "opsly-ai-dj.xml") -> str:
    os.makedirs(xml_dir, exist_ok=True)
    path = os.path.join(xml_dir, filename)
    with open(path, "w", encoding="utf-8") as fh:
        fh.write(xml_text)
    return path