from __future__ import annotations

import json
import subprocess
import tempfile
from pathlib import Path
import unittest

from tools.cli.brand_agent import load_intake_schema, profile_from_client, profile_from_input, validate_intake_payload, write_dry_run_artifacts  # type: ignore


REPO_ROOT = Path(__file__).resolve().parents[3]
SCRIPT = REPO_ROOT / "scripts" / "brand-agent.py"
EXAMPLES = REPO_ROOT / "examples" / "intake"


class BrandAgentTests(unittest.TestCase):
    def test_preset_client_still_works(self) -> None:
        profile = profile_from_client("peskids")
        self.assertEqual(profile.short_name, "Peskids")

    def test_input_json_works(self) -> None:
        profile = profile_from_input(EXAMPLES / "icso.json")
        self.assertEqual(profile.company_name, "IntCloudSysOps")

    def test_missing_required_field_fails_clearly(self) -> None:
        with self.assertRaises(ValueError) as ctx:
            validate_intake_payload({"companyName": "x"})
        self.assertIn("shortName", str(ctx.exception))

    def test_output_files_are_generated(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            profile = profile_from_input(EXAMPLES / "agency-partner.json")
            files = write_dry_run_artifacts(profile, Path(tmp))
            for path in files.values():
                self.assertTrue(path.exists())
            report = json.loads(files["report"].read_text(encoding="utf-8"))
            self.assertEqual(report["summary"]["shortName"], "Agency Partner")

    def test_cli_dry_run_with_client(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            result = subprocess.run(["python3", str(SCRIPT), "dry-run", "--client", "peskids", "--out-dir", tmp], capture_output=True, text=True)
            self.assertEqual(result.returncode, 0, msg=result.stderr)

    def test_cli_dry_run_with_input_json(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            result = subprocess.run(["python3", str(SCRIPT), "dry-run", "--input", str(EXAMPLES / "icso.json"), "--out-dir", tmp], capture_output=True, text=True)
            self.assertEqual(result.returncode, 0, msg=result.stderr)

    def test_load_intake_schema(self) -> None:
        schema = load_intake_schema()
        self.assertIn("companyName", schema["required"])

    def test_main_rejects_missing_args(self) -> None:
        result = subprocess.run(["python3", str(SCRIPT), "dry-run", "--client", "peskids", "--input", str(EXAMPLES / "icso.json")], capture_output=True, text=True)
        self.assertNotEqual(result.returncode, 0)


if __name__ == "__main__":
    unittest.main()

