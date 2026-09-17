"""Unit tests for tools/live-automation/obs_capture_source_watcher.py
(no real OBS required)."""
from __future__ import annotations

import unittest
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import obs_capture_source_watcher as w


class TestObsCaptureSourceWatcher(unittest.TestCase):
    def test_not_reachable_when_connect_fails(self) -> None:
        with patch.object(w, "connect", return_value=None):
            self.assertEqual(w.ensure_capture_source(), "not_reachable")

    def test_already_present_skips_create(self) -> None:
        mock_c = MagicMock()
        mock_c.get_current_program_scene.return_value = SimpleNamespace(
            current_program_scene_name="Scene"
        )
        mock_c.get_scene_item_list.return_value = SimpleNamespace(
            scene_items=[{"sourceName": "Display Capture"}]
        )
        with patch.object(w, "connect", return_value=mock_c):
            self.assertEqual(w.ensure_capture_source(), "already_present")
        mock_c.create_input.assert_not_called()

    def test_creates_source_when_missing(self) -> None:
        mock_c = MagicMock()
        mock_c.get_current_program_scene.return_value = SimpleNamespace(
            current_program_scene_name="Scene"
        )
        mock_c.get_scene_item_list.return_value = SimpleNamespace(scene_items=[])
        with patch.object(w, "connect", return_value=mock_c):
            self.assertEqual(w.ensure_capture_source(), "created")
        mock_c.create_input.assert_called_once_with(
            "Scene", "Display Capture", "monitor_capture", {}, True
        )

    def test_scene_override_skips_current_scene_lookup(self) -> None:
        mock_c = MagicMock()
        mock_c.get_scene_item_list.return_value = SimpleNamespace(scene_items=[])
        with patch.object(w, "SCENE_OVERRIDE", "Gameplay"):
            with patch.object(w, "connect", return_value=mock_c):
                self.assertEqual(w.ensure_capture_source(), "created")
        mock_c.get_current_program_scene.assert_not_called()
        mock_c.create_input.assert_called_once_with(
            "Gameplay", "Display Capture", "monitor_capture", {}, True
        )

    def test_falls_back_to_scene_named_scene_if_lookup_fails(self) -> None:
        mock_c = MagicMock()
        mock_c.get_current_program_scene.side_effect = RuntimeError("no scene")
        mock_c.get_scene_item_list.return_value = SimpleNamespace(scene_items=[])
        with patch.object(w, "connect", return_value=mock_c):
            self.assertEqual(w.ensure_capture_source(), "created")
        mock_c.create_input.assert_called_once_with(
            "Scene", "Display Capture", "monitor_capture", {}, True
        )

    def test_create_failure_is_reported_as_error(self) -> None:
        mock_c = MagicMock()
        mock_c.get_current_program_scene.return_value = SimpleNamespace(
            current_program_scene_name="Scene"
        )
        mock_c.get_scene_item_list.return_value = SimpleNamespace(scene_items=[])
        mock_c.create_input.side_effect = RuntimeError("already exists")
        with patch.object(w, "connect", return_value=mock_c):
            self.assertEqual(w.ensure_capture_source(), "error")

    def test_disconnects_even_on_error(self) -> None:
        mock_c = MagicMock()
        mock_c.get_current_program_scene.side_effect = RuntimeError("boom")
        mock_c.get_scene_item_list.side_effect = RuntimeError("boom")
        with patch.object(w, "connect", return_value=mock_c):
            w.ensure_capture_source()
        mock_c.disconnect.assert_called_once()


if __name__ == "__main__":
    unittest.main()
