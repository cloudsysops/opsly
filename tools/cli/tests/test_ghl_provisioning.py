from __future__ import annotations

import json
import subprocess
from pathlib import Path
import unittest

from tools.cli.ghl_provisioning import discover_capabilities, generate_all


REPO_ROOT = Path(__file__).resolve().parents[3]
SCRIPT = REPO_ROOT / "scripts" / "ghl-provisioning.py"


class GhlProvisioningTests(unittest.TestCase):
    def test_discover_capabilities(self) -> None:
        matrix = discover_capabilities()
        features = {row["feature"]: row for row in matrix["features"]}
        self.assertEqual(features["Contacts"]["executionChannel"], "REST")
        self.assertEqual(features["Conversations"]["executionChannel"], "MCP")
        self.assertEqual(features["Brand Board"]["executionChannel"], "CHROME")

    def test_generate_all_writes_expected_files(self) -> None:
        result = generate_all(["icso", "peskids"])
        self.assertTrue(Path(result["capabilityMatrixPath"]).exists())
        self.assertTrue(Path(result["executionReportPath"]).exists())
        self.assertTrue((Path(result["handoffDir"]) / "icso-chrome-checklist.md").exists())
        self.assertTrue((Path(result["handoffDir"]) / "peskids-chrome-checklist.md").exists())
        report = Path(result["executionReportPath"]).read_text(encoding="utf-8")
        self.assertIn("READY FOR CLAUDE CHROME FINALIZATION", report)

    def test_cli_json_output(self) -> None:
        result = subprocess.run(["python3", str(SCRIPT), "--client", "icso", "--json"], capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, msg=result.stderr)
        payload = json.loads(result.stdout)
        self.assertIn("report", payload)


if __name__ == "__main__":
    unittest.main()

