"""Unit tests for tools/live-automation/scene_control.py (no real OBS required)."""
from __future__ import annotations

import unittest
from unittest.mock import MagicMock, patch

import dispatch
import scene_control as sc
import scene_map


def _mock_client(scenes, current="Coding", honor_switch=True):
    client = MagicMock()
    state = {"current": current}

    client.get_scene_list.side_effect = lambda: {
        "scenes": scenes,
        "current_program_scene_name": state["current"],
    }
    client.get_current_program_scene.side_effect = lambda: {
        "current_program_scene_name": state["current"]
    }

    def _set(name):
        if honor_switch:
            state["current"] = name

    client.set_current_program_scene.side_effect = _set
    client.get_stream_status.return_value = {"output_active": False}
    client.get_record_status.return_value = {"output_active": False}
    return client


ALL_SCENES = [
    "Iniciando Stream",
    "Battlefield 6 — Día 2",
    "Coding",
    "OAD_FACTORY_FOCUS",
    "Vuelvo en un momento",
    "Terminando Stream",
]


class TestSceneMap(unittest.TestCase):
    def test_every_binding_targets_an_existing_scene(self) -> None:
        for binding in scene_map.LOGICAL_SCENES.values():
            self.assertIn(
                binding.physical,
                ALL_SCENES,
                msg=f"{binding.logical} points at a scene that does not exist",
            )

    def test_physical_scenes_are_unique(self) -> None:
        physical = [b.physical for b in scene_map.LOGICAL_SCENES.values()]
        self.assertEqual(len(physical), len(set(physical)))

    def test_ending_is_operator_only(self) -> None:
        self.assertIn("ending", scene_map.OPERATOR_ONLY)
        self.assertNotIn("ending", scene_map.REMOTE_ALLOWED)

    def test_aliases_resolve(self) -> None:
        for alias, expected in (("factory", "factory_focus"), ("brb", "intermission"), ("game", "gaming")):
            self.assertEqual(scene_map.resolve(alias).logical, expected.upper())

    def test_unknown_scene_fails_closed(self) -> None:
        with self.assertRaises(ValueError) as ctx:
            scene_map.resolve("rm -rf /")
        self.assertIn("unknown", str(ctx.exception).lower())

    def test_empty_scene_fails_closed(self) -> None:
        with self.assertRaises(ValueError):
            scene_map.resolve("   ")

    def test_operator_only_scene_rejected_on_remote_surface(self) -> None:
        with self.assertRaises(PermissionError) as ctx:
            scene_map.resolve_remote("ending")
        self.assertIn("operator-only", str(ctx.exception).lower())

    def test_logical_for_physical_roundtrip(self) -> None:
        self.assertEqual(scene_map.logical_for_physical("Coding"), "CODING")
        self.assertIsNone(scene_map.logical_for_physical("gaming 2"))


class TestSceneControl(unittest.TestCase):
    @patch.object(sc.dispatch, "_client")
    def test_unknown_scene_is_rejected_before_obs_call(self, mock_factory: MagicMock) -> None:
        client = _mock_client(ALL_SCENES)
        mock_factory.return_value = client
        with self.assertRaises(ValueError):
            sc._switch(client, "evil_exec", False, False)
        client.set_current_program_scene.assert_not_called()

    @patch.object(sc.dispatch, "_client")
    def test_operator_only_scene_is_rejected_before_obs_call(self, mock_factory: MagicMock) -> None:
        client = _mock_client(ALL_SCENES)
        mock_factory.return_value = client
        with self.assertRaises(PermissionError):
            sc._switch(client, "ending", False, False)
        client.set_current_program_scene.assert_not_called()

    @patch.object(sc.dispatch, "_client")
    def test_missing_physical_scene_is_not_created(self, mock_factory: MagicMock) -> None:
        client = _mock_client(["Coding"])
        mock_factory.return_value = client
        with self.assertRaises(LookupError) as ctx:
            sc._switch(client, "gaming", False, False)
        self.assertIn("missing", str(ctx.exception).lower())
        client.set_current_program_scene.assert_not_called()

    @patch.object(sc.dispatch, "_client")
    def test_dry_run_never_mutates(self, mock_factory: MagicMock) -> None:
        client = _mock_client(ALL_SCENES)
        mock_factory.return_value = client
        out = sc._switch(client, "intermission", True, False)
        self.assertTrue(out["dry_run"])
        self.assertTrue(out["would_switch"])
        self.assertEqual(out["physical"], "Vuelvo en un momento")
        client.set_current_program_scene.assert_not_called()

    @patch.object(sc.dispatch, "_client")
    def test_switch_reads_back_and_verifies(self, mock_factory: MagicMock) -> None:
        client = _mock_client(ALL_SCENES)
        mock_factory.return_value = client
        out = sc._switch(client, "intermission", False, False)
        self.assertTrue(out["verified"])
        self.assertEqual(out["previous_physical_scene"], "Coding")
        self.assertEqual(out["current_physical_scene"], "Vuelvo en un momento")
        client.set_current_program_scene.assert_called_once_with("Vuelvo en un momento")

    @patch.object(sc.dispatch, "_client")
    def test_failed_switch_is_reported_not_claimed(self, mock_factory: MagicMock) -> None:
        client = _mock_client(ALL_SCENES, honor_switch=False)
        mock_factory.return_value = client
        with self.assertRaises(RuntimeError) as ctx:
            sc._switch(client, "intermission", False, False)
        self.assertIn("did not take effect", str(ctx.exception).lower())

    @patch.object(sc.dispatch, "_client")
    def test_unreachable_overlay_blocks_switch_unless_overridden(self, mock_factory: MagicMock) -> None:
        client = _mock_client(ALL_SCENES)
        mock_factory.return_value = client

        with patch.object(sc, "_probe", return_value=[{"url": "u", "ok": False}]):
            with self.assertRaises(RuntimeError) as ctx:
                sc._switch(client, "factory_focus", False, False)
            self.assertIn("--allow-degraded", str(ctx.exception))
            client.set_current_program_scene.assert_not_called()

            out = sc._switch(client, "factory_focus", False, True)
            self.assertTrue(out["verified"])

    @patch.object(sc.dispatch, "_client")
    def test_gaming_blocked_when_game_process_absent(self, mock_factory: MagicMock) -> None:
        client = _mock_client(ALL_SCENES)
        mock_factory.return_value = client
        with patch.object(sc, "_probe_processes", return_value=[{"process": "bf6.exe", "ok": False}]):
            with self.assertRaises(RuntimeError) as ctx:
                sc._switch(client, "gaming", False, False)
            self.assertIn("bf6.exe", str(ctx.exception))
            client.set_current_program_scene.assert_not_called()

    @patch.object(sc.dispatch, "_client")
    def test_dry_run_reports_block_without_failing(self, mock_factory: MagicMock) -> None:
        client = _mock_client(ALL_SCENES)
        mock_factory.return_value = client
        with patch.object(sc, "_probe_processes", return_value=[{"process": "bf6.exe", "ok": False}]):
            out = sc._switch(client, "gaming", True, False)
        self.assertTrue(out["dry_run"])
        self.assertTrue(out["would_be_blocked"])
        self.assertEqual(out["physical"], "Battlefield 6 — Día 2")
        client.set_current_program_scene.assert_not_called()

    @patch.object(sc.dispatch, "_client")
    def test_status_reports_logical_and_physical(self, mock_factory: MagicMock) -> None:
        client = _mock_client(ALL_SCENES)
        mock_factory.return_value = client
        out = sc._status(client)
        self.assertEqual(out["current_logical_scene"], "CODING")
        self.assertEqual(out["current_physical_scene"], "Coding")
        self.assertFalse(out["stream_output_active"])
        self.assertTrue(all(row["available"] for row in out["scenes"]))

    def test_streaming_actions_remain_blocked(self) -> None:
        self.assertIn("start_stream", dispatch.BLOCKED_ACTIONS)
        self.assertIn("stop_stream", dispatch.BLOCKED_ACTIONS)
        self.assertNotIn("start_stream", dispatch.ALLOWED)


if __name__ == "__main__":
    unittest.main()