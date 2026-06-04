from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any, Dict, List

REPO_ROOT = Path(__file__).resolve().parents[2]
BRAND_ROOT = REPO_ROOT / "docs" / "artifacts" / "brand-agent" / "examples"
HANDOFF_ROOT = REPO_ROOT / "docs" / "artifacts" / "ghl-handoff"
MATRIX_PATH = REPO_ROOT / "config" / "capability-matrix.json"
DOC_REPORT_PATH = REPO_ROOT / "docs" / "reports" / "GHL-EXECUTION-REPORT.md"


def _read_json(path: Path) -> Dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def discover_capabilities() -> Dict[str, Any]:
    return {
        "generatedAt": "2026-06-04T00:00:00Z",
        "features": [
            {"feature": "Contacts", "wrapperSupport": "FULL", "mcpAdapterSupport": "FULL", "ghlApiSupport": "FULL", "executionChannel": "REST", "notes": "Use REST for deterministic CRUD/search; MCP for conversational flows."},
            {"feature": "Opportunities", "wrapperSupport": "FULL", "mcpAdapterSupport": "NONE", "ghlApiSupport": "FULL", "executionChannel": "REST", "notes": "Wrapper has CRUD/search; pipeline creation remains manual."},
            {"feature": "Calendars", "wrapperSupport": "FULL", "mcpAdapterSupport": "NONE", "ghlApiSupport": "FULL", "executionChannel": "REST", "notes": "Keep calendar provisioning deterministic in REST."},
            {"feature": "Conversations", "wrapperSupport": "PARTIAL", "mcpAdapterSupport": "PARTIAL", "ghlApiSupport": "FULL", "executionChannel": "MCP", "notes": "MCP is better for inbox/thread operations."},
            {"feature": "Tags", "wrapperSupport": "FULL", "mcpAdapterSupport": "NONE", "ghlApiSupport": "FULL", "executionChannel": "REST", "notes": "Wrapper handles tag CRUD."},
            {"feature": "Custom Fields", "wrapperSupport": "FULL", "mcpAdapterSupport": "NONE", "ghlApiSupport": "FULL", "executionChannel": "REST", "notes": "Wrapper handles list/create custom fields."},
            {"feature": "Forms", "wrapperSupport": "NONE", "mcpAdapterSupport": "NONE", "ghlApiSupport": "PARTIAL", "executionChannel": "CHROME", "notes": "Forms authoring remains UI/manual."},
            {"feature": "Email Templates", "wrapperSupport": "NONE", "mcpAdapterSupport": "NONE", "ghlApiSupport": "FULL", "executionChannel": "REST", "notes": "Email template APIs exist; wrapper does not expose them yet."},
            {"feature": "SMS Templates", "wrapperSupport": "NONE", "mcpAdapterSupport": "NONE", "ghlApiSupport": "PARTIAL", "executionChannel": "CHROME", "notes": "Template management remains manual for this slice."},
            {"feature": "Workflows", "wrapperSupport": "NONE", "mcpAdapterSupport": "NONE", "ghlApiSupport": "PARTIAL", "executionChannel": "CHROME", "notes": "Authoring remains UI/manual."},
            {"feature": "Snapshots", "wrapperSupport": "NONE", "mcpAdapterSupport": "NONE", "ghlApiSupport": "PARTIAL", "executionChannel": "CHROME", "notes": "Snapshot authoring/export remains UI/manual."},
            {"feature": "Brand Board", "wrapperSupport": "NONE", "mcpAdapterSupport": "NONE", "ghlApiSupport": "NONE", "executionChannel": "CHROME", "notes": "Brand board is UI-only."},
            {"feature": "Domains", "wrapperSupport": "NONE", "mcpAdapterSupport": "NONE", "ghlApiSupport": "NONE", "executionChannel": "CHROME", "notes": "DNS and whitelabel are UI/account level."},
            {"feature": "Roles", "wrapperSupport": "NONE", "mcpAdapterSupport": "NONE", "ghlApiSupport": "NONE", "executionChannel": "CHROME", "notes": "Role provisioning remains manual."},
        ],
    }


def _load(client_key: str) -> Dict[str, Any]:
    base = BRAND_ROOT / client_key
    return {"brandKit": _read_json(base / "brand-kit.json"), "manifest": _read_json(base / "ghl-setup-manifest.json"), "report": _read_json(base / "dry-run-report.json")}


def _write(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def _build_handoff(client_key: str, matrix: Dict[str, Any]) -> str:
    data = _load(client_key)
    manifest = data["manifest"]
    lines = [f"# {manifest['companyName']} Claude Chrome Checklist", "", "## Brand Board", "- Review and apply the final brand board manually.", "", "## Logo Upload", "- Upload the primary logo asset in the UI.", "", "## Favicon Upload", "- Upload the favicon asset in the UI.", "", "## Roles", "- Configure or verify staff roles in the agency admin UI.", "", "## Domains", "- Review branded domains and DNS state before saving.", "", "## Whitelabel", "- Apply whitelabel settings in the agency UI.", "", "## Snapshot Creation", "- Create or refresh the snapshot from the UI once manual steps are complete.", "", "## Workflow UI Configuration", "- Complete workflow authoring and UI wiring manually.", "", "## Unsupported GHL Areas"]
    for row in matrix["features"]:
        if row["executionChannel"] == "CHROME":
            lines.append(f"- {row['feature']}: {row['notes']}")
    return "\n".join(lines) + "\n"


def build_execution_report(clients: List[str], matrix: Dict[str, Any]) -> Dict[str, Any]:
    rest = mcp = chrome = 0
    per_client: Dict[str, Any] = {}
    for client_key in clients:
        data = _load(client_key)
        manifest = data["manifest"]
        tags = [t["name"] for t in manifest.get("tags", [])]
        custom_fields = [f["fieldName"] for f in manifest.get("customFields", [])]
        calendars = [c["name"] for c in manifest.get("calendars", [])]
        email = [e["name"] for e in manifest.get("emailTemplates", [])]
        mcp_actions = [{"label": "Contacts / Conversations", "note": "Use MCP for conversational/assistant-driven flows and message threading."}]
        rest_actions = [{"label": "Tags", "details": tags}, {"label": "Custom Fields", "details": custom_fields}, {"label": "Calendars", "details": calendars}, {"label": "Email Templates", "details": email}]
        chrome_actions = [r["feature"] for r in matrix["features"] if r["executionChannel"] == "CHROME"]
        rest += len(rest_actions)
        mcp += len(mcp_actions)
        chrome += len(chrome_actions)
        per_client[client_key] = {"rest": rest_actions, "mcp": mcp_actions, "chrome": chrome_actions, "blocked": []}
    total = rest + mcp + chrome
    return {"clients": per_client, "metrics": {"totalActions": total, "restCount": rest, "mcpCount": mcp, "chromeCount": chrome, "blockedCount": 0, "automationPercentage": round(((rest + mcp) / total) * 100, 1) if total else 0.0}, "status": "READY FOR CLAUDE CHROME FINALIZATION"}


def generate_all(clients: List[str]) -> Dict[str, Any]:
    matrix = discover_capabilities()
    MATRIX_PATH.write_text(json.dumps(matrix, indent=2, ensure_ascii=True) + "\n", encoding="utf-8")
    HANDOFF_ROOT.mkdir(parents=True, exist_ok=True)
    for client_key in clients:
        _write(HANDOFF_ROOT / f"{client_key}-chrome-checklist.md", _build_handoff(client_key, matrix))
    report = build_execution_report(clients, matrix)
    DOC_REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    DOC_REPORT_PATH.write_text(
        "# GHL Execution Report\n\n## Status\nREADY FOR CLAUDE CHROME FINALIZATION\n",
        encoding="utf-8",
    )
    return {
        "capabilityMatrixPath": str(MATRIX_PATH),
        "executionReportPath": str(DOC_REPORT_PATH),
        "handoffDir": str(HANDOFF_ROOT),
        "report": report,
    }


def main(argv: Any = None) -> int:
    parser = argparse.ArgumentParser(prog="ghl-provisioning")
    parser.add_argument("--client", action="append", choices=["icso", "peskids"])
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args(argv)
    result = generate_all(args.client or ["icso", "peskids"])
    if args.json:
        print(json.dumps(result, indent=2, ensure_ascii=True))
    else:
        print(result["report"]["status"])
    return 0

