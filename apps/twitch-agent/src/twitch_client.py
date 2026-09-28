"""Twitch Helix API client with automatic OAuth token refresh.

Reads/writes credentials from a dotenv-style file (default: runtime/twitch.env,
same file the account setup wrote to). Refreshes the access_token using the
refresh_token whenever a call gets a 401, or proactively if the caller asks
via ensure_fresh_token(). Twitch rotates the refresh_token on every refresh
call, so the file is rewritten in place after each refresh.
"""
from __future__ import annotations

import os
import re
import time
import threading
from pathlib import Path
from typing import Any, Optional

import requests

TWITCH_OAUTH_URL = "https://id.twitch.tv/oauth2/token"
TWITCH_VALIDATE_URL = "https://id.twitch.tv/oauth2/validate"
TWITCH_API_BASE = "https://api.twitch.tv/helix"


class TwitchAuthError(RuntimeError):
    pass


class TwitchApiError(RuntimeError):
    def __init__(self, status: int, message: str):
        super().__init__(f"HTTP {status}: {message}")
        self.status = status


def _parse_env_file(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    if not path.exists():
        return values
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        m = re.match(r'^([A-Z_][A-Z0-9_]*)=(.*)$', line)
        if not m:
            continue
        key, val = m.group(1), m.group(2)
        val = val.strip().strip('"')
        values[key] = val
    return values


def _write_env_file(path: Path, values: dict[str, str]) -> None:
    """Rewrite the file preserving comments/order for known keys, in place."""
    lines = path.read_text(encoding="utf-8").splitlines(keepends=False)
    seen = set()
    out = []
    for line in lines:
        stripped = line.strip()
        m = re.match(r'^([A-Z_][A-Z0-9_]*)=', stripped)
        if m and m.group(1) in values:
            key = m.group(1)
            out.append(f"{key}={values[key]}")
            seen.add(key)
        else:
            out.append(line)
    for key, val in values.items():
        if key not in seen:
            out.append(f"{key}={val}")
    path.write_text("\n".join(out) + "\n", encoding="utf-8")


class TwitchClient:
    """Thread-safe Twitch Helix client with self-refreshing credentials.

    All state lives in the env file on disk (default runtime/twitch.env) so
    that a service restart doesn't lose a freshly rotated refresh_token.
    """

    def __init__(self, env_path: Optional[str] = None):
        self.env_path = Path(env_path or os.environ.get("TWITCH_ENV_FILE", "runtime/twitch.env"))
        self._lock = threading.Lock()
        self._cached: dict[str, str] = {}
        self._expires_at: float = 0.0
        self._load()

    def _load(self) -> None:
        self._cached = _parse_env_file(self.env_path)
        required = ("TWITCH_CLIENT_ID", "TWITCH_CLIENT_SECRET", "TWITCH_ACCESS_TOKEN", "TWITCH_REFRESH_TOKEN")
        missing = [k for k in required if not self._cached.get(k)]
        if missing:
            raise TwitchAuthError(f"Missing keys in {self.env_path}: {missing}")

    @property
    def client_id(self) -> str:
        return self._cached["TWITCH_CLIENT_ID"]

    @property
    def broadcaster_id(self) -> str:
        return self._cached.get("TWITCH_CHANNEL_ID", "")

    def _headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self._cached['TWITCH_ACCESS_TOKEN']}",
            "Client-Id": self.client_id,
        }

    def _refresh(self) -> None:
        resp = requests.post(
            TWITCH_OAUTH_URL,
            data={
                "client_id": self.client_id,
                "client_secret": self._cached["TWITCH_CLIENT_SECRET"],
                "grant_type": "refresh_token",
                "refresh_token": self._cached["TWITCH_REFRESH_TOKEN"],
            },
            timeout=15,
        )
        if resp.status_code != 200:
            raise TwitchAuthError(f"refresh failed: HTTP {resp.status_code}: {resp.text[:300]}")
        data = resp.json()
        self._cached["TWITCH_ACCESS_TOKEN"] = data["access_token"]
        self._cached["TWITCH_REFRESH_TOKEN"] = data["refresh_token"]
        self._expires_at = time.time() + data.get("expires_in", 3600)
        with self._lock:
            _write_env_file(self.env_path, {
                "TWITCH_ACCESS_TOKEN": self._cached["TWITCH_ACCESS_TOKEN"],
                "TWITCH_REFRESH_TOKEN": self._cached["TWITCH_REFRESH_TOKEN"],
            })

    def ensure_fresh_token(self, margin_seconds: int = 300) -> None:
        """Refresh proactively if we're within `margin_seconds` of expiry,
        or if we don't know the expiry yet (validate once)."""
        with self._lock:
            if self._expires_at == 0.0:
                try:
                    v = requests.get(TWITCH_VALIDATE_URL, headers=self._headers(), timeout=10)
                    if v.status_code == 200:
                        self._expires_at = time.time() + v.json().get("expires_in", 0)
                    else:
                        self._expires_at = 0.0
                except requests.RequestException:
                    self._expires_at = 0.0
        if self._expires_at == 0.0 or time.time() > (self._expires_at - margin_seconds):
            self._refresh()

    def _request(self, method: str, path: str, retried: bool = False, **kwargs) -> Any:
        self.ensure_fresh_token()
        url = f"{TWITCH_API_BASE}{path}"
        resp = requests.request(method, url, headers=self._headers(), timeout=15, **kwargs)
        if resp.status_code == 401 and not retried:
            self._refresh()
            return self._request(method, path, retried=True, **kwargs)
        if resp.status_code >= 400:
            raise TwitchApiError(resp.status_code, resp.text[:500])
        if resp.text:
            return resp.json()
        return {}

    # ---- Read actions ----

    def get_channel(self) -> dict:
        data = self._request("GET", f"/channels?broadcaster_id={self.broadcaster_id}")
        items = data.get("data", [])
        return items[0] if items else {}

    def get_stream_status(self) -> dict:
        data = self._request("GET", f"/streams?user_id={self.broadcaster_id}")
        items = data.get("data", [])
        return items[0] if items else {}

    def get_stream_key(self) -> str:
        data = self._request("GET", f"/streams/key?broadcaster_id={self.broadcaster_id}")
        items = data.get("data", [])
        return items[0]["stream_key"] if items else ""

    # ---- Write actions ----

    def set_title(self, title: str) -> None:
        self._request("PATCH", f"/channels?broadcaster_id={self.broadcaster_id}",
                       json={"title": title})

    def set_category(self, game_id: str) -> None:
        self._request("PATCH", f"/channels?broadcaster_id={self.broadcaster_id}",
                       json={"game_id": game_id})

    def search_category(self, name: str) -> list[dict]:
        data = self._request("GET", f"/search/categories?query={requests.utils.quote(name)}")
        return data.get("data", [])

    def create_clip(self) -> dict:
        data = self._request("POST", f"/clips?broadcaster_id={self.broadcaster_id}")
        items = data.get("data", [])
        return items[0] if items else {}
