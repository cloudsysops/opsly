#!/usr/bin/env python3
"""Tests del agente AI DJ (stdlib unittest; sin pytest instalado).

Correr: python3 apps/ai-dj/test_ai_dj.py
"""
import json
import os
import sys
import unittest

SRC = os.path.join(os.path.dirname(os.path.abspath(__file__)), "src")
if SRC not in sys.path:
    sys.path.insert(0, SRC)

import mapping_xml  # noqa: E402
import midi_serato  # noqa: E402
import router as router_mod  # noqa: E402
import serato_library  # noqa: E402
import setlist  # noqa: E402
from obs_client import authentication  # noqa: E402

os.environ.setdefault("OPSLY_AI_DJ_AGENT_URL", "http://localhost:5013")


class TestAuthentication(unittest.TestCase):
    def test_formula_protocolo(self):
        # Firma del reto de obs-websocket v5:
        #   secret = base64( sha256(password + salt) + challenge )
        import base64
        import hashlib

        password, salt, challenge = "supersecret", "s3cr3t-salt", "foo"
        expected = base64.b64encode(
            hashlib.sha256((password + salt).encode()).digest() + challenge.encode()
        ).decode("ascii")
        self.assertEqual(authentication(password, salt, challenge), expected)
        # distintos salts -> distintos secrets
        other = authentication("supersecret", "otro-salt", "foo")
        self.assertNotEqual(other, authentication(password, salt, challenge))


class TestMapping(unittest.TestCase):
    def test_genera_xml_decks_y_mixer(self):
        xml = mapping_xml.generate(deck_channels=("A", "B"))
        self.assertIn('<control channel="1"', xml)
        self.assertIn('<control channel="2"', xml)
        self.assertIn('channel="8" type="cc"', xml)
        self.assertIn('function="PLAY"', xml)
        self.assertIn('function="CROSSFADER_POS"', xml)
        self.assertIn("</midi>", xml)

    def test_hotcue_notas_secuenciales(self):
        xml = mapping_xml.generate(deck_channels=("A",), notes={"hotcue": 94})
        self.assertIn('number="94"', xml)
        self.assertIn('number="95"', xml)
        self.assertIn('CUE_HOT_START_4', xml)

    def test_midi_layout_bindings_se_usan_en_xml(self):
        from midi_serato import midi_layout
        notas = {"play": 88, "cue": 89, "sync": 90, "back": 91, "fwd": 92,
                 "load": 93, "hotcue": 94, "loop": 95, "fx_on_off": 96,
                 "tempo_up": 97, "tempo_down": 98}
        layout = midi_layout(notas)
        xml = mapping_xml.generate(deck_channels=("A", "B"), notes=notas)
        for item in layout:
            self.assertIn(f'function="{mapping_xml.FUNCTION_MAP[item["action"]]}"', xml)


class TestSeratoParser(unittest.TestCase):
    def test_parse_archivo_minimo(self):
        import struct

        def rec(tag, payload):
            return tag + struct.pack(">I", len(payload)) + payload

        def utf16(s):
            payload = s.encode("utf-16-be")
            return struct.pack(">H", len(payload) // 2) + payload

        pfil = rec(b"pfil", utf16("/Users/dragon/Music/track.mp3"))
        tttl = rec(b"tttl", utf16("Mi Tema"))
        part = rec(b"part", utf16("Artista"))
        bpm = rec(b"bpm", struct.pack(">f", 128.5))
        key = rec(b"pkey", b"\x08\x00")
        otrk = rec(b"otrk", pfil + tttl + part + bpm + key)
        vrsn = rec(b"vrsn", b"\x03\x00\x00\x00\x00\x02")
        db = vrsn + otrk
        tracks = serato_library._parse_database(db)
        self.assertEqual(len(tracks), 1)
        t = tracks[0]
        self.assertEqual(t["title"], "Mi Tema")
        self.assertEqual(t["artist"], "Artista")
        self.assertEqual(t["bpm"], 128.5)
        self.assertEqual(t["key_raw"], "0800")


class TestSetlist(unittest.TestCase):
    def test_camelot_vecinos(self):
        self.assertIn("7A", setlist.camelot_neighbors("8A"))
        self.assertIn("9A", setlist.camelot_neighbors("8A"))
        self.assertIn("8B", setlist.camelot_neighbors("8A"))

    def test_plan_next_armonico_y_determinista(self):
        tracks = [
            {"title": f"t{i}", "artist": "", "bpm": 120 + i, "key": "8A"} for i in range(10)
        ] + [{"title": "lejana", "artist": "", "bpm": 145, "key": "1A"}]
        a = setlist.plan_next(tracks, last_key="8A", last_bpm=122, count=3, seed=1)
        b = setlist.plan_next(tracks, last_key="8A", last_bpm=122, count=3, seed=1)
        self.assertEqual([t["title"] for t in a], [t["title"] for t in b])
        self.assertEqual(len(a), 3)
        self.assertNotIn("lejana", a)

    def test_normalize_key_musical(self):
        self.assertEqual(setlist.normalize_key("A minor"), "8A")
        self.assertEqual(setlist.normalize_key("8A"), "8A")


class TestRouterParse(unittest.TestCase):
    def test_stream_commands(self):
        self.assertEqual(router_mod.parse("stream start"), ("stream.start", {}))
        self.assertEqual(router_mod.parse("stream stop"), ("stream.stop", {}))
        self.assertEqual(router_mod.parse("stream status"), ("stream.status", {}))

    def test_deck_commands(self):
        self.assertEqual(router_mod.parse("deck A play"), ("deck.play", {"deck": "A"}))
        self.assertEqual(router_mod.parse("pause b"), ("deck.pause", {"deck": "B"}))
        self.assertEqual(router_mod.parse("deck A hotcue 2"), ("deck.hotcue", {"deck": "A", "slot": 2}))
        self.assertEqual(router_mod.parse("deck B tempo up 1"), ("deck.tempo", {"deck": "B", "direction": "up", "amount": 1.0}))

    def test_json_prompt(self):
        action, params = router_mod.parse('{"action": "mixer.crossfader", "params": {"percent": 70}}')
        self.assertEqual(action, "mixer.crossfader")
        self.assertEqual(params, {"percent": 70})

    def test_unknown_raises(self):
        with self.assertRaises(router_mod.ActionError):
            router_mod.parse("haz magia")


class TestServiceImports(unittest.TestCase):
    def test_carga_servicio(self):
        import ai_dj_service  # noqa: F401
        self.assertTrue(hasattr(ai_dj_service, "build_server"))


if __name__ == "__main__":
    unittest.main(verbosity=2)