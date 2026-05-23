"""Unit tests for tools/live-automation/dispatch.py (no real OBS required)."""
from __future__ import annotations

import unittest
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import dispatch as d


class TestDispatch(unittest.TestCase):
    def test_unknown_action(self) -> None:
        with self.assertRaises(ValueError) as ctx:
            d.run_command({"action": "evil_exec", "params": {}})
        self.assertIn("unknown", str(ctx.exception).lower())

    def test_params_must_be_object(self) -> None:
        with self.assertRaises(ValueError) as ctx:
            d.run_command({"action": "get_version", "params": "nope"})
        self.assertIn("params", str(ctx.exception).lower())

    def test_set_scene_requires_name(self) -> None:
        mock_c = MagicMock()
        with patch.object(d, "_client", return_value=mock_c):
            with self.assertRaises(ValueError):
                d.run_command({"action": "set_current_program_scene", "params": {}})
        mock_c.set_current_program_scene.assert_not_called()

    @patch.object(d, "_client")
    def test_set_scene_calls_obs(self, mock_factory: MagicMock) -> None:
        mock_c = MagicMock()
        mock_factory.return_value = mock_c
        out = d.run_command(
            {"action": "set_current_program_scene", "params": {"scene_name": "  Main  "}},
        )
        mock_c.set_current_program_scene.assert_called_once_with("Main")
        self.assertEqual(out.get("scene_name"), "Main")

    @patch.object(d, "_client")
    def test_get_version_serializes(self, mock_factory: MagicMock) -> None:
        mock_c = MagicMock()
        mock_c.get_version.return_value = SimpleNamespace(obs_version="30.0.0", _private=1)
        mock_factory.return_value = mock_c
        out = d.run_command({"action": "get_version"})
        self.assertEqual(out.get("obs_version"), "30.0.0")
        self.assertNotIn("_private", out)


if __name__ == "__main__":
    unittest.main()
