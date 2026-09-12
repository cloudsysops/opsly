extends Node

const CONTENT_PACK_PATH := "res://generated/game-content.pack.json"

func _ready() -> void:
    print("{{GAME_TITLE}} — Opsly game blueprint")
    var pack := _load_content_pack()
    if pack.is_empty():
        push_warning("No generated Opsly content pack found yet.")
        return
    print("Loaded content pack for: ", pack.get("game_slug", "{{GAME_SLUG}}"))

func _load_content_pack() -> Dictionary:
    if not FileAccess.file_exists(CONTENT_PACK_PATH):
        return {}
    var file := FileAccess.open(CONTENT_PACK_PATH, FileAccess.READ)
    if file == null:
        return {}
    var parsed = JSON.parse_string(file.get_as_text())
    return parsed if typeof(parsed) == TYPE_DICTIONARY else {}
