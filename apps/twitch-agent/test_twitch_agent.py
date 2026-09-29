"""Unit tests for the Twitch agent — no network calls, no real credentials.

Exercises the deterministic router against a fake client, and the env-file
read/write round trip used for token rotation.
"""
import os
import sys
import tempfile
import unittest

SRC = os.path.join(os.path.dirname(os.path.abspath(__file__)), "src")
sys.path.insert(0, SRC)

import router as router_mod  # noqa: E402
from twitch_client import _parse_env_file, _write_env_file  # noqa: E402


class FakeClient:
    def __init__(self):
        self.title = None
        self.category_id = None
        self.refreshed = False
        self._live = False
        self.search_results = None  # override per-test; default set below

    def set_title(self, title):
        self.title = title

    def search_category(self, name):
        if self.search_results is not None:
            return self.search_results
        return [{"id": "12345", "name": name}]

    def set_category(self, game_id):
        self.category_id = game_id

    def get_stream_status(self):
        return {"title": "t", "game_name": "g", "viewer_count": 3,
                "started_at": "x"} if self._live else {}

    def get_stream_key(self):
        return "live_fake_key"

    def create_clip(self):
        return {"id": "clip1", "edit_url": "https://example/clip1"}

    def ensure_fresh_token(self, margin_seconds=300):
        self.refreshed = True

    def get_channel(self):
        return {"broadcaster_name": "opsafterdark", "title": "t", "game_name": "g"}


class RouterTests(unittest.TestCase):
    def setUp(self):
        self.client = FakeClient()
        self.router = router_mod.Router(self.client)

    def test_channel_title(self):
        result = self.router.resolve('channel.title "OpsAfterDark live"')
        self.assertIn("OpsAfterDark live", result)
        self.assertEqual(self.client.title, "OpsAfterDark live")

    def test_channel_category(self):
        result = self.router.resolve("channel.category Battlefield 6")
        self.assertEqual(self.client.category_id, "12345")
        self.assertIn("Battlefield 6", result)

    def test_channel_category_prefers_exact_match_over_top_result(self):
        # Regression: Twitch's search ranks by relevance, not text match —
        # "Battlefield 6" came back at position 16, behind "Battlefield 1942".
        self.client.search_results = [
            {"id": "11684", "name": "Battlefield 1942"},
            {"id": "15467", "name": "Battlefield 2"},
            {"id": "168648543", "name": "Battlefield 6"},
        ]
        result = self.router.resolve("channel.category Battlefield 6")
        self.assertEqual(self.client.category_id, "168648543")
        self.assertIn("Battlefield 6", result)
        self.assertNotIn("no exact match", result)

    def test_channel_category_falls_back_to_top_result_without_exact_match(self):
        self.client.search_results = [
            {"id": "999", "name": "Some Other Game"},
        ]
        result = self.router.resolve("channel.category Nonexistent Game")
        self.assertEqual(self.client.category_id, "999")
        self.assertIn("no exact match", result)

    def test_stream_status_offline(self):
        result = self.router.resolve("stream.status")
        self.assertIn("offline", result)

    def test_stream_status_live(self):
        self.client._live = True
        result = self.router.resolve("stream.status")
        self.assertIn("LIVE", result)

    def test_clip_create_requires_live(self):
        with self.assertRaises(router_mod.ActionError):
            self.router.resolve("clip.create")

    def test_clip_create_ok(self):
        self.client._live = True
        result = self.router.resolve("clip.create")
        self.assertIn("clip1", result)

    def test_stream_key_not_echoed(self):
        result = self.router.resolve("stream.key")
        self.assertNotIn("live_fake_key", result)

    def test_unknown_action(self):
        with self.assertRaises(router_mod.ActionError):
            self.router.resolve("bogus.action")

    def test_empty_prompt(self):
        with self.assertRaises(router_mod.ActionError):
            self.router.resolve("")

    def test_token_refresh(self):
        result = self.router.resolve("token.refresh")
        self.assertTrue(self.client.refreshed)
        self.assertIn("refreshed", result)

    def test_status_all(self):
        result = self.router.resolve("status.all")
        self.assertIn("opsafterdark", result)
        self.assertIn("live=False", result)


class EnvFileTests(unittest.TestCase):
    def test_round_trip_preserves_unknown_lines_and_updates_known_keys(self):
        with tempfile.TemporaryDirectory() as d:
            path = os.path.join(d, "twitch.env")
            with open(path, "w", encoding="utf-8") as f:
                f.write(
                    "# comment\n"
                    "TWITCH_CLIENT_ID=abc\n"
                    "TWITCH_ACCESS_TOKEN=old_access\n"
                    "TWITCH_REFRESH_TOKEN=old_refresh\n"
                )
            from pathlib import Path
            values = _parse_env_file(Path(path))
            self.assertEqual(values["TWITCH_CLIENT_ID"], "abc")

            _write_env_file(Path(path), {
                "TWITCH_ACCESS_TOKEN": "new_access",
                "TWITCH_REFRESH_TOKEN": "new_refresh",
            })
            updated = _parse_env_file(Path(path))
            self.assertEqual(updated["TWITCH_ACCESS_TOKEN"], "new_access")
            self.assertEqual(updated["TWITCH_REFRESH_TOKEN"], "new_refresh")
            self.assertEqual(updated["TWITCH_CLIENT_ID"], "abc")
            with open(path, encoding="utf-8") as f:
                text = f.read()
            self.assertIn("# comment", text)


if __name__ == "__main__":
    unittest.main()
