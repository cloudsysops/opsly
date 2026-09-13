class_name SteamAdapter
extends RefCounted

# Steam is intentionally an adapter, never the source of game truth.
# This implementation remains inert until a Steam runtime plugin is explicitly wired.

var _enabled := false
var _app_id := ""

func configure(runtime_config: Dictionary = {}) -> void:
    _app_id = str(runtime_config.get("app_id", "")).strip_edges()
    _enabled = false

func is_available() -> bool:
    return _enabled

func app_id() -> String:
    return _app_id

func initialize() -> Dictionary:
    if _app_id == "":
        return {
            "ok": false,
            "code": "STEAM_APP_ID_NOT_CONFIGURED",
            "message": "Steam adapter disabled; running standalone build."
        }

    # Future GodotSteam/Steamworks integration attaches here.
    # Do not fake Steam initialization before the real runtime is present.
    return {
        "ok": false,
        "code": "STEAM_RUNTIME_NOT_BOUND",
        "message": "AppID present, but Steam runtime adapter has not been bound."
    }

func unlock_achievement(_achievement_id: String) -> bool:
    return false

func set_rich_presence(_key: String, _value: String) -> bool:
    return false

func request_stats() -> bool:
    return false
