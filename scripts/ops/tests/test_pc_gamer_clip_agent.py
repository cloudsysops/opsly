"""Tests for the PC Gamer Python clip-agent coordinator."""

from __future__ import annotations

import importlib.util
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch


MODULE_PATH = Path(__file__).parents[1] / "pc-gamer-clip-agent.py"
SPEC = importlib.util.spec_from_file_location("pc_gamer_clip_agent", MODULE_PATH)
assert SPEC and SPEC.loader
agent = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(agent)


class TestPcGamerClipAgent(unittest.TestCase):
    def test_builds_canonical_content_studio_command(self) -> None:
        command = agent.build_pipeline_command(Path("/repo"), "gaming", Path("/videos/clip.mp4"))
        self.assertEqual(
            command,
            [
                "npx",
                "tsx",
                "scripts/content-os-cli.ts",
                "prepare-highlight",
                "--tenant",
                "gaming",
                "--file",
                "/videos/clip.mp4",
            ],
        )

    def test_rejects_non_video_or_empty_input(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            empty = Path(directory) / "empty.mp4"
            empty.touch()
            with self.assertRaises(ValueError):
                agent.validate_media_file(empty)

            text_file = Path(directory) / "notes.txt"
            text_file.write_text("not media", encoding="utf-8")
            with self.assertRaises(ValueError):
                agent.validate_media_file(text_file)

    @patch.object(agent.subprocess, "run")
    def test_returns_approval_required_result(self, run_mock) -> None:
        with tempfile.TemporaryDirectory() as directory:
            media = Path(directory) / "highlight.mp4"
            media.write_bytes(b"owned synthetic fixture")
            run_mock.return_value.returncode = 0
            run_mock.return_value.stdout = "project-123\n"
            run_mock.return_value.stderr = ""

            result = agent.run_clip_job(Path(directory), "gaming", media)

        self.assertEqual(result["project_id"], "project-123")
        self.assertTrue(result["approval_required"])
        self.assertEqual(result["publishing"], "disabled")
        run_mock.assert_called_once()


if __name__ == "__main__":
    unittest.main()
