"""Pure logic tests for oad's allowlist/mapping — no live OBS connection.

Run: /home/opsly/.venvs/obs-watcher/bin/python3 -m unittest scripts/streaming/__tests__/test_oad.py
"""
import importlib.util
import pathlib
import unittest
from importlib.machinery import SourceFileLoader

_OAD_PATH = pathlib.Path(__file__).resolve().parents[1] / "oad"
_loader = SourceFileLoader("oad_module", str(_OAD_PATH))
_spec = importlib.util.spec_from_loader("oad_module", _loader)
oad = importlib.util.module_from_spec(_spec)
_loader.exec_module(oad)


class ResolvePhysicalSceneTests(unittest.TestCase):
    def test_rejects_unknown_logical_scene(self) -> None:
        with self.assertRaises(ValueError):
            oad.resolve_physical_scene("DROP_TABLE_USERS", {"GAMING": "Gaming"})

    def test_rejects_arbitrary_injected_scene_name(self) -> None:
        with self.assertRaises(ValueError):
            oad.resolve_physical_scene("Battlefield 6 — Día 2", {"GAMING": "Gaming"})

    def test_resolves_configured_logical_scene(self) -> None:
        self.assertEqual(
            oad.resolve_physical_scene("CODING", {"CODING": "Coding"}),
            "Coding",
        )

    def test_unconfigured_mapping_returns_none_not_a_guess(self) -> None:
        self.assertIsNone(
            oad.resolve_physical_scene("FACTORY_FOCUS", {"FACTORY_FOCUS": None})
        )

    def test_allowlist_matches_documented_minimal_surface(self) -> None:
        self.assertEqual(
            set(oad.ALLOWED_LOGICAL_SCENES),
            {"GAMING", "CODING", "FACTORY_FOCUS", "INTERMISSION"},
        )


class ResolveCliAliasTests(unittest.TestCase):
    def test_documented_cli_words_all_resolve(self) -> None:
        self.assertEqual(oad.resolve_cli_alias("gaming"), "GAMING")
        self.assertEqual(oad.resolve_cli_alias("coding"), "CODING")
        self.assertEqual(oad.resolve_cli_alias("factory"), "FACTORY_FOCUS")
        self.assertEqual(oad.resolve_cli_alias("intermission"), "INTERMISSION")

    def test_is_case_insensitive(self) -> None:
        self.assertEqual(oad.resolve_cli_alias("Factory"), "FACTORY_FOCUS")

    def test_rejects_unknown_word(self) -> None:
        with self.assertRaises(ValueError):
            oad.resolve_cli_alias("starting_soon")

    def test_rejects_raw_logical_name_not_cli_word(self) -> None:
        # CLI surface is the short word, not the internal FACTORY_FOCUS name.
        with self.assertRaises(ValueError):
            oad.resolve_cli_alias("FACTORY_FOCUS")


if __name__ == "__main__":
    unittest.main()
