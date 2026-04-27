from __future__ import annotations

import json
import subprocess
import threading
from dataclasses import dataclass
from pathlib import Path
from typing import Any


class MCPClientError(RuntimeError):
    """Raised when MCP communication fails."""


@dataclass(frozen=True)
class MCPTool:
    name: str
    description: str
    input_schema: dict[str, Any]


class OpslyMCPClient:
    def __init__(self, server_command: list[str], workspace_root: Path) -> None:
        self._server_command = server_command
        self._workspace_root = workspace_root
        self._proc: subprocess.Popen[bytes] | None = None
        self._next_id = 1
        self._io_lock = threading.Lock()

    def connect(self, timeout_seconds: float = 8.0) -> None:
        if self._proc is not None:
            return
        self._proc = subprocess.Popen(
            self._server_command,
            cwd=self._workspace_root,
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
        init_error: list[Exception] = []
        init_ok = threading.Event()

        def _initialize() -> None:
            try:
                init_result = self._request(
                    "initialize",
                    {
                        "protocolVersion": "2024-11-05",
                        "capabilities": {},
                        "clientInfo": {"name": "opsly-hacker-cli", "version": "0.1.0"},
                    },
                )
                if not isinstance(init_result, dict):
                    raise MCPClientError("Invalid initialize response from MCP server")
                self._notify("notifications/initialized", {})
                init_ok.set()
            except Exception as exc:  # noqa: BLE001
                init_error.append(exc)

        thread = threading.Thread(target=_initialize, daemon=True)
        thread.start()
        thread.join(timeout=timeout_seconds)

        if init_ok.is_set():
            return

        self.close()
        if len(init_error) > 0:
            raise init_error[0]
        raise MCPClientError(f"Timeout connecting to MCP server ({timeout_seconds:.1f}s)")

    def close(self) -> None:
        if self._proc is None:
            return
        if self._proc.poll() is None:
            self._proc.terminate()
            try:
                self._proc.wait(timeout=3)
            except subprocess.TimeoutExpired:
                self._proc.kill()
        self._proc = None

    def list_tools(self) -> list[MCPTool]:
        result = self._request("tools/list", {})
        if not isinstance(result, dict):
            raise MCPClientError("tools/list returned unexpected payload")
        tools_raw = result.get("tools", [])
        if not isinstance(tools_raw, list):
            raise MCPClientError("tools/list returned malformed tools array")

        parsed: list[MCPTool] = []
        for item in tools_raw:
            if not isinstance(item, dict):
                continue
            name = str(item.get("name", "")).strip()
            description = str(item.get("description", "")).strip()
            input_schema = item.get("inputSchema", {})
            if name == "":
                continue
            if not isinstance(input_schema, dict):
                input_schema = {}
            parsed.append(MCPTool(name=name, description=description, input_schema=input_schema))
        return parsed

    def call_tool(self, name: str, args: dict[str, Any]) -> dict[str, Any]:
        result = self._request("tools/call", {"name": name, "arguments": args})
        if not isinstance(result, dict):
            return {"success": False, "error": "Tool returned non-object response"}
        return result

    def _notify(self, method: str, params: dict[str, Any]) -> None:
        payload = {"jsonrpc": "2.0", "method": method, "params": params}
        self._write_message(payload)

    def _request(self, method: str, params: dict[str, Any]) -> Any:
        with self._io_lock:
            request_id = self._next_id
            self._next_id += 1
            payload = {"jsonrpc": "2.0", "id": request_id, "method": method, "params": params}
            self._write_message(payload)

            while True:
                message = self._read_message()
                if "id" not in message:
                    # Notification/event from server; ignore for request/response flow.
                    continue
                if message.get("id") != request_id:
                    continue

                if "error" in message:
                    error = message["error"]
                    if isinstance(error, dict):
                        msg = str(error.get("message", "Unknown MCP error"))
                    else:
                        msg = str(error)
                    raise MCPClientError(msg)
                return message.get("result")

    def _write_message(self, payload: dict[str, Any]) -> None:
        if self._proc is None or self._proc.stdin is None:
            raise MCPClientError("MCP server is not connected")
        encoded = (json.dumps(payload, separators=(",", ":"), ensure_ascii=False) + "\n").encode(
            "utf-8"
        )
        try:
            self._proc.stdin.write(encoded)
            self._proc.stdin.flush()
        except BrokenPipeError as exc:
            raise MCPClientError("MCP server closed the stdin pipe") from exc

    def _read_message(self) -> dict[str, Any]:
        if self._proc is None or self._proc.stdout is None:
            raise MCPClientError("MCP server is not connected")

        line = self._proc.stdout.readline()
        if line == b"":
            stderr = b""
            if self._proc.stderr is not None:
                stderr = self._proc.stderr.read() or b""
            extra = stderr.decode("utf-8", errors="replace").strip()
            exit_code = self._proc.poll()
            msg = f"MCP server process ended unexpectedly (exit_code={exit_code})"
            if extra != "":
                msg = f"{msg}: {extra}"
            raise MCPClientError(msg)

        raw = line.decode("utf-8", errors="replace").strip()
        if raw == "":
            raise MCPClientError("Invalid MCP frame: empty line")
        decoded = json.loads(raw)
        if not isinstance(decoded, dict):
            raise MCPClientError("Invalid MCP frame: body is not an object")
        return decoded
