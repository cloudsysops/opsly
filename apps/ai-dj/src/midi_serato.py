"""Puerto MIDI virtual para conducir Serato DJ Pro desde el AI DJ.

Crea (o reusa) un puerto de salida virtual "OPSLY AI DJ". Serato lo detecta
como un controlador MIDI; el mapping XML (`mapping_xml.py`) asigna los mismos
canales/notas para que las acciones caigan en el deck correcto.

Canales XML (1-indexed): deck A = 1, deck B = 2, mezclador = 8.
El byte de canal del mensaje MIDI es `canal - 1` (0-indexed).
"""
import threading

try:
    import rtmidi  # type: ignore
except Exception:  # pragma: no cover - sin python-rtmidi
    rtmidi = None


class MidiUnavailable(RuntimeError):
    pass


class SeratoMidi:
    MIXER_LABELS = ("M", "MIXER", "X")

    def __init__(self, port_name: str = "OPSLY AI DJ", deck_channels=("A", "B")):
        self.port_name = port_name
        self.deck_channels = list(deck_channels)
        self._out = None
        self._lock = threading.Lock()
        self.last_error: str | None = None
        self.ready: bool = False

    # ------------------------------------------------------------------ setup
    def ensure_open(self) -> bool:
        if self._out is not None:
            return True
        if rtmidi is None:
            raise MidiUnavailable("python-rtmidi no disponible: pip install python-rtmidi")
        out = rtmidi.MidiOut()
        ports = out.get_ports()
        idx = next((i for i, name in enumerate(ports) if self.port_name in name), None)
        if idx is None:
            out.open_virtual_port(self.port_name)
        else:
            out.open_port(idx)
        self._out = out
        self.ready = True
        self.last_error = None
        return True

    # ------------------------------------------------------------------ internals
    def _channel(self, deck: str) -> int:
        if deck.upper() in self.MIXER_LABELS:
            return 8
        label = deck.upper()
        if label not in self.deck_channels:
            raise ValueError(f"deck desconocido: {deck} (disponibles: {', '.join(self.deck_channels)})")
        return self.deck_channels.index(label) + 1

    def _send(self, status: int, data1: int, data2: int) -> None:
        with self._lock:
            self.ensure_open()
            self._out.send_message([status, data1, data2])

    # ------------------------------------------------------------------ api midi
    def note(self, deck: str, note: int, velocity: int = 127, on: bool = True) -> None:
        ch = self._channel(deck)
        self._send(0x90 | (ch - 1), note, velocity if on else 0)

    def cc(self, target: str, cc_num: int, value: int) -> None:
        ch = self._channel(target)
        self._send(0xB0 | (ch - 1), cc_num, max(0, min(127, int(value))))

    def crossfader(self, percent: float) -> None:
        self.cc("M", 84, round(max(0.0, min(100.0, percent)) * 127 / 100))


# Acciones de alto nivel ~ coinciden con las funciones del mapping XML.
def midi_layout(notes: dict) -> list[dict]:
    """Notas por acción para cada deck (misma tabla que genera el XML)."""
    simple = ("play", "cue", "sync", "back", "fwd", "load",
              "loop", "fx_on_off", "tempo_up", "tempo_down")
    layout: list[dict] = []
    hot_base = int(notes.get("hotcue", 94))
    for deck in ("A", "B"):
        for action in simple:
            layout.append({"deck": deck, "action": action, "note": notes[action], "type": "note"})
        for slot in range(1, 5):
            layout.append({"deck": deck, "action": f"hotcue_start_{slot}",
                           "note": hot_base + slot - 1, "type": "note"})
    return layout