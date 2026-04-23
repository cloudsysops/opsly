#!/usr/bin/env python3
"""
Opsly Drive automation (Google Drive API) — stdlib only.

Goals:
- Ensure the Drive folder layout under the Opsly root folder exists (PROMPTS/CONFIG/EXECUTIONS/ARCHITECTURE).
- Upload local onboarding prompts + tenant JSON configs for repeatable tenant onboarding (Option B).

Auth:
- Uses GOOGLE_SERVICE_ACCOUNT_JSON (inline JSON) or GOOGLE_SERVICE_ACCOUNT_JSON_FILE.
- Optional: reads GOOGLE_SERVICE_ACCOUNT_JSON from Doppler (same project/config as other Opsly scripts).

Scopes:
- Defaults to drive (full) for folder creation + uploads. You can override with OPSLY_DRIVE_SCOPE.
"""

from __future__ import annotations

import argparse
import base64
import json
import os
import shutil
import subprocess
import time
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from pathlib import Path
from typing import Any


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[1]


def _read_json_file(path: Path) -> dict[str, Any]:
    raw = path.read_text(encoding="utf-8").lstrip("\ufeff")
    return json.loads(raw)


def _load_drive_layout() -> dict[str, Any]:
    layout = _read_json_file(_repo_root() / "config" / "opsly-drive-automation.json")
    root = str(os.environ.get("OPSLY_DRIVE_ROOT_FOLDER_ID", "")).strip()
    if not root:
        root = str(layout.get("root_folder_id", "")).strip()
    if not root:
        raise RuntimeError(
            "Missing Drive root folder id. Set OPSLY_DRIVE_ROOT_FOLDER_ID "
            "or fill config/opsly-drive-automation.json:root_folder_id."
        )
    layout["root_folder_id"] = root
    return layout


def _load_service_account_json() -> dict[str, Any]:
    raw = os.environ.get("GOOGLE_SERVICE_ACCOUNT_JSON", "").strip()
    if not raw:
        p = os.environ.get("GOOGLE_SERVICE_ACCOUNT_JSON_FILE", "").strip()
        if p:
            raw = Path(p).read_text(encoding="utf-8").strip()
    if not raw and shutil.which("doppler"):
        # Best-effort: match other scripts' convention.
        try:
            raw = subprocess.check_output(
                [
                    "doppler",
                    "secrets",
                    "get",
                    "GOOGLE_SERVICE_ACCOUNT_JSON",
                    "--project",
                    "ops-intcloudsysops",
                    "--config",
                    "prd",
                    "--plain",
                ],
                text=True,
            ).strip()
        except Exception:
            raw = ""

    if not raw:
        raise RuntimeError(
            "Missing GOOGLE_SERVICE_ACCOUNT_JSON / GOOGLE_SERVICE_ACCOUNT_JSON_FILE "
            "(and could not read from doppler)."
        )

    obj = json.loads(raw)
    if isinstance(obj, str):
        obj = json.loads(obj)
    if not isinstance(obj, dict):
        raise RuntimeError("GOOGLE_SERVICE_ACCOUNT_JSON must decode to a JSON object.")
    if obj.get("type") != "service_account":
        raise RuntimeError("GOOGLE_SERVICE_ACCOUNT_JSON must be a service_account JSON.")
    return obj


def _b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode("ascii").rstrip("=")


def _jwt_for_sa(sa: dict[str, Any], scope: str) -> str:
    private_key = sa.get("private_key", "")
    client_email = sa.get("client_email", "")
    if not private_key or not client_email:
        raise RuntimeError("service_account json missing private_key/client_email")

    header = {"alg": "RS256", "typ": "JWT"}
    now = int(time.time())
    body = {
        "iss": client_email,
        "scope": scope,
        "aud": "https://oauth2.googleapis.com/token",
        "iat": now - 90,
        "exp": now + 3600,
    }

    signing_input = f"{_b64url(json.dumps(header, separators=(',', ':')).encode())}.{_b64url(json.dumps(body, separators=(',', ':')).encode())}".encode(
        "ascii"
    )

    # openssl dgst -sha256 -sign <(printf '%s' "$private_key")
    import tempfile

    with tempfile.NamedTemporaryFile("w", encoding="utf-8", delete=False) as kf:
        kf.write(private_key)
        key_path = kf.name

    try:
        sig = subprocess.check_output(["openssl", "dgst", "-sha256", "-sign", key_path], input=signing_input)
    finally:
        try:
            os.remove(key_path)
        except OSError:
            pass

    jwt = signing_input.decode("ascii") + "." + _b64url(sig)
    return jwt


def _oauth_token_from_jwt(jwt: str) -> str:
    data = urllib.parse.urlencode(
        {
            "grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer",
            "assertion": jwt,
        }
    ).encode("utf-8")
    req = urllib.request.Request(
        "https://oauth2.googleapis.com/token",
        data=data,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        payload = json.loads(resp.read().decode("utf-8"))
    token = payload.get("access_token", "")
    if not token:
        raise RuntimeError(f"Failed to obtain access_token: {payload}")
    return str(token)


@dataclass(frozen=True)
class DriveClient:
    access_token: str

    def _headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self.access_token}",
        }

    def get_json(self, url: str) -> Any:
        req = urllib.request.Request(url, headers=self._headers(), method="GET")
        try:
            with urllib.request.urlopen(req, timeout=120) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            body = e.read().decode("utf-8", errors="replace")
            raise RuntimeError(f"HTTP {e.code} GET {url}: {body[:2000]}") from e

    def post_json(self, url: str, body: bytes, content_type: str, method: str = "POST") -> Any:
        req = urllib.request.Request(
            url,
            data=body,
            headers={**self._headers(), "Content-Type": content_type},
            method=method,
        )
        try:
            with urllib.request.urlopen(req, timeout=300) as resp:
                raw = resp.read().decode("utf-8")
                return json.loads(raw) if raw else {}
        except urllib.error.HTTPError as e:
            err = e.read().decode("utf-8", errors="replace")
            raise RuntimeError(f"HTTP {e.code} {method} {url}: {err[:2000]}") from e

    def patch_bytes(self, url: str, data: bytes, content_type: str) -> Any:
        req = urllib.request.Request(
            url,
            data=data,
            headers={**self._headers(), "Content-Type": content_type},
            method="PATCH",
        )
        try:
            with urllib.request.urlopen(req, timeout=600) as resp:
                raw = resp.read().decode("utf-8")
                return json.loads(raw) if raw else {}
        except urllib.error.HTTPError as e:
            err = e.read().decode("utf-8", errors="replace")
            raise RuntimeError(f"HTTP {e.code} PATCH {url}: {err[:2000]}") from e

    def get_bytes(self, url: str) -> bytes:
        req = urllib.request.Request(url, headers=self._headers(), method="GET")
        try:
            with urllib.request.urlopen(req, timeout=600) as resp:
                return resp.read()
        except urllib.error.HTTPError as e:
            err = e.read().decode("utf-8", errors="replace")
            raise RuntimeError(f"HTTP {e.code} GET {url}: {err[:2000]}") from e


def drive_query_files(client: DriveClient, q: str, fields: str) -> list[dict[str, Any]]:
    qs = urllib.parse.urlencode(
        {
            "q": q,
            "fields": fields,
            "supportsAllDrives": "true",
            "includeItemsFromAllDrives": "true",
            "spaces": "drive",
        }
    )
    url = f"https://www.googleapis.com/drive/v3/files?{qs}"
    data = client.get_json(url)
    return list(data.get("files", []))


def find_child_folder_id(client: DriveClient, parent_id: str, name: str) -> str | None:
    safe_name = name.replace("'", "\\'")
    q = f"name='{safe_name}' and '{parent_id}' in parents and trashed=false and mimeType='application/vnd.google-apps.folder'"
    files = drive_query_files(client, q, "files(id,name)")
    if not files:
        return None
    return str(files[0]["id"])


def create_folder(client: DriveClient, parent_id: str, name: str) -> str:
    meta = {"name": name, "mimeType": "application/vnd.google-apps.folder", "parents": [parent_id]}
    qs = urllib.parse.urlencode({"supportsAllDrives": "true"})
    url = f"https://www.googleapis.com/drive/v3/files?{qs}"
    created = client.post_json(url, json.dumps(meta).encode("utf-8"), "application/json; charset=UTF-8")
    return str(created["id"])


def ensure_child_folder(client: DriveClient, parent_id: str, name: str) -> str:
    existing = find_child_folder_id(client, parent_id, name)
    if existing:
        return existing
    return create_folder(client, parent_id, name)


def find_file_in_folder_by_name(client: DriveClient, parent_id: str, filename: str) -> str | None:
    safe = filename.replace("'", "\\'")
    q = f"name='{safe}' and '{parent_id}' in parents and trashed=false"
    files = drive_query_files(client, q, "files(id,name,mimeType)")
    if not files:
        return None
    return str(files[0]["id"])


def upload_or_update_file(
    client: DriveClient,
    parent_id: str,
    local_path: Path,
    *,
    mime: str,
) -> str:
    filename = local_path.name
    file_id = find_file_in_folder_by_name(client, parent_id, filename)

    data = local_path.read_bytes()
    qs = urllib.parse.urlencode({"uploadType": "media", "supportsAllDrives": "true"})

    if file_id:
        url = f"https://www.googleapis.com/upload/drive/v3/files/{urllib.parse.quote(file_id)}?{qs}"
        updated = client.patch_bytes(url, data, mime)
        return str(updated["id"])

    # Create metadata (empty file) then upload media (simple/resilient).
    create_qs = urllib.parse.urlencode({"supportsAllDrives": "true"})
    create_url = f"https://www.googleapis.com/drive/v3/files?{create_qs}"
    meta = {"name": filename, "parents": [parent_id]}
    created = client.post_json(create_url, json.dumps(meta).encode("utf-8"), "application/json; charset=UTF-8")
    new_id = str(created["id"])

    upload_qs = urllib.parse.urlencode({"uploadType": "media", "supportsAllDrives": "true"})
    upload_url = f"https://www.googleapis.com/upload/drive/v3/files/{urllib.parse.quote(new_id)}?{upload_qs}"
    client.patch_bytes(upload_url, data, mime)
    return new_id


def export_google_doc(
    client: DriveClient,
    *,
    file_id: str,
    out_path: Path,
    mime: str,
) -> int:
    qs = urllib.parse.urlencode(
        {
            "mimeType": mime,
            "supportsAllDrives": "true",
        }
    )
    url = f"https://www.googleapis.com/drive/v3/files/{urllib.parse.quote(file_id)}/export?{qs}"
    data = client.get_bytes(url)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_bytes(data)
    return len(data)


def cmd_ensure_layout(_: argparse.Namespace) -> int:
    layout = _load_drive_layout()
    root_id = str(layout["root_folder_id"])
    folders = dict(layout.get("folders", {}))

    sa = _load_service_account_json()
    scope = os.environ.get("OPSLY_DRIVE_SCOPE", "https://www.googleapis.com/auth/drive")
    token = _oauth_token_from_jwt(_jwt_for_sa(sa, scope))
    client = DriveClient(token)

    for _, folder_name in folders.items():
        fid = ensure_child_folder(client, root_id, str(folder_name))
        print(f"[drive] OK folder '{folder_name}' -> {fid}")

    return 0


def cmd_upload_tenant_pack(_: argparse.Namespace) -> int:
    layout = _load_drive_layout()
    root_id = str(layout["root_folder_id"])
    folder_names = dict(layout.get("folders", {}))

    sa = _load_service_account_json()
    scope = os.environ.get("OPSLY_DRIVE_SCOPE", "https://www.googleapis.com/auth/drive")
    token = _oauth_token_from_jwt(_jwt_for_sa(sa, scope))
    client = DriveClient(token)

    prompts_parent = ensure_child_folder(client, root_id, str(folder_names.get("prompts", "PROMPTS")))
    config_parent = ensure_child_folder(client, root_id, str(folder_names.get("config", "CONFIG")))

    prompt_dir = _repo_root() / "docs" / "prompts" / "tenant-onboarding"
    for p in sorted(prompt_dir.glob("*.md")):
        fid = upload_or_update_file(client, prompts_parent, p, mime="text/markdown")
        print(f"[drive] uploaded prompt {p.name} -> {fid}")

    tenants_dir = _repo_root() / "config" / "tenants"
    for p in sorted(tenants_dir.glob("*.json")):
        if p.name.startswith("_") or p.name == "schema.tenant-config.json":
            continue
        fid = upload_or_update_file(client, config_parent, p, mime="application/json")
        print(f"[drive] uploaded tenant config {p.name} -> {fid}")

    return 0


def cmd_export_doc(ns: argparse.Namespace) -> int:
    sa = _load_service_account_json()
    scope = os.environ.get("OPSLY_DRIVE_IMPORT_SCOPE", "https://www.googleapis.com/auth/drive.readonly")
    token = _oauth_token_from_jwt(_jwt_for_sa(sa, scope))
    client = DriveClient(token)

    out = Path(ns.out)
    size = export_google_doc(client, file_id=str(ns.file_id), out_path=out, mime=str(ns.mime))
    print(f"[drive] exported doc {ns.file_id} -> {out} ({size} bytes)")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(prog="opsly_drive_automation")
    sub = parser.add_subparsers(dest="cmd", required=True)

    p_layout = sub.add_parser("ensure-layout", help="Create PROMPTS/CONFIG/EXECUTIONS/ARCHITECTURE under the Opsly root folder")
    p_layout.set_defaults(func=cmd_ensure_layout)

    p_pack = sub.add_parser("upload-tenant-pack", help="Upload generic onboarding prompts + tenant JSON configs")
    p_pack.set_defaults(func=cmd_upload_tenant_pack)

    p_export = sub.add_parser("export-doc", help="Export a Google Doc to a local file (binary/text)")
    p_export.add_argument("--file-id", required=True)
    p_export.add_argument("--out", required=True)
    p_export.add_argument(
        "--mime",
        default="text/plain",
        help="Export mime type (default: text/plain). Examples: text/html, application/pdf",
    )
    p_export.set_defaults(func=cmd_export_doc)

    ns = parser.parse_args()
    return int(ns.func(ns))


if __name__ == "__main__":
    raise SystemExit(main())
