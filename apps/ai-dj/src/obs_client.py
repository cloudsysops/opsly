"""obs-websocket v5 client minimal para el control de streaming del AI DJ.

Protocolo:
  Hello (op 0) -> auth salt+challenge si el servidor lo requiere
  Identify (op 1) con rpcVersion 1
  Request (op 6) -> RequestResponse (op 7)
Firma del reto (spec obs-websocket):
  secret = base64( sha256(password + salt) + challenge )
"""
import base64
import hashlib
import json
import threading
import time
import uuid

try:
    from websocket import create_connection, WebSocketTimeoutException  # type: ignore
except Exception:  # pragma: no cover - sin websocket-client
    create_connection = None
    WebSocketTimeoutException = Exception


def authentication(password: str, salt: str, challenge: str) -> str:
    """Calcula el campo `authentication` del mensaje Identify."""
    secret = hashlib.sha256(password.encode("utf-8") + salt.encode("utf-8")).digest()
    return base64.b64encode(secret + challenge.encode("utf-8")).decode("ascii")


class ObsError(RuntimeError):
    pass


class ObsClient:
    """Cliente síncrono con reconexión perezosa y lock por hilo."""

    def __init__(self, endpoint: str, password: str | None = None, timeout: float = 10.0):
        self.endpoint = endpoint
        self._password = password
        self.timeout = timeout
        self._ws = None
        self._lock = threading.Lock()
        self.last_error: str | None = None
        self.connected: bool = False

    # ------------------------------------------------------------------ helpers
    def _read_message(self) -> dict:
        if create_connection is None:
            raise ObsError("websocket-client no disponible: pip install websocket-client")
        deadline = time.monotonic() + self.timeout
        while True:
            remaining = deadline - time.monotonic()
            if remaining <= 0:
                raise TimeoutError("obs-websocket sin respuesta")
            try:
                raw = self._ws.recv()
                if self._ws is None:
                    raise ObsError("socket cerrado")
                return json.loads(raw)
            except WebSocketTimeoutException:
                continue

    def _ensure_connected(self) -> None:
        if self._ws is not None:
            return
        if create_connection is None:
            raise ObsError("websocket-client no disponible: pip install websocket-client")
        ws = create_connection(self.endpoint, timeout=self.timeout)
        hello = json.loads(ws.recv())
        auth = (hello.get("d") or {}).get("authentication") or {}
        secret = None
        if auth:
            if not self._password:
                ws.close()
                raise ObsError("obs-websocket pide autenticación y no hay password configurado")
            secret = authentication(self._password, auth["salt"], auth["challenge"])
        d = {"rpcVersion": 1}
        if secret:
            d["authentication"] = secret
        ws.send(json.dumps({"op": 1, "d": d}))
        while True:
            msg = json.loads(ws.recv())
            if msg.get("op") == 2:  # Identified
                break
        self._ws = ws
        self.connected = True
        self.last_error = None

    def _close(self) -> None:
        try:
            if self._ws is not None:
                self._ws.close()
        except Exception:  # noqa: BLE001
            pass
        self._ws = None
        self.connected = False

    # ------------------------------------------------------------------ api
    def call(self, request_type: str, request_data: dict | None = None) -> dict:
        """Envía un Request de obs-websocket v5 y devuelve responseData."""
        with self._lock:
            try:
                self._ensure_connected()
                rid = uuid.uuid4().hex
                payload = {"op": 6, "d": {
                    "requestType": request_type,
                    "requestId": rid,
                    "requestData": request_data or {},
                }}
                self._ws.send(json.dumps(payload))
                while True:
                    d = self._read_message().get("d") or {}
                    if d.get("requestId") != rid:
                        continue
                    status = d.get("requestStatus") or {}
                    if status.get("result"):
                        return d.get("responseData") or {}
                    comment = status.get("comment") or status.get("code") or "unknown"
                    raise ObsError(f"{request_type} falló: {comment}")
            except Exception as exc:  # noqa: BLE001
                self.last_error = str(exc)
                self._close()
                raise ObsError(str(exc))

    def stream_status(self) -> dict:
        return self.call("GetStreamStatus")

    def start_stream(self) -> dict:
        return self.call("StartStream")

    def stop_stream(self) -> dict:
        return self.call("StopStream")

    def set_scene(self, scene_name: str) -> dict:
        return self.call("SetCurrentProgramScene", {"sceneName": scene_name})

    def get_scene_list(self) -> dict:
        return self.call("GetSceneList")

    def get_stream_service_settings(self) -> dict:
        return self.call("GetStreamServiceSettings")

    def set_stream_service_settings(self, service_type: str, settings: dict) -> dict:
        return self.call(
            "SetStreamServiceSettings",
            {"streamServiceType": service_type, "streamServiceSettings": settings},
        )