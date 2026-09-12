extends Node

const CONTENT_PACK_PATH := "res://generated/game-content.pack.json"
const FIRST_SCENE := "res://scenes/mode_hub.tscn"

func _ready() -> void:
    _install_default_input_map()
    var pack := _load_content_pack()
    if pack.is_empty():
        push_error("Astral Arena: missing or invalid Opsly content pack.")
        return

    var version := int(pack.get("schema_version", 0))
    if version != 1:
        push_error("Astral Arena: unsupported content pack schema version: %s" % version)
        return

    ProjectSettings.set_setting("astral_arena/runtime/content_pack", pack)
    print("Astral Arena content pack loaded: ", pack.get("title", "unknown"))
    get_tree().change_scene_to_file(FIRST_SCENE)

func _load_content_pack() -> Dictionary:
    if not FileAccess.file_exists(CONTENT_PACK_PATH):
        return {}

    var file := FileAccess.open(CONTENT_PACK_PATH, FileAccess.READ)
    if file == null:
        return {}

    var parsed = JSON.parse_string(file.get_as_text())
    return parsed if typeof(parsed) == TYPE_DICTIONARY else {}

func _install_default_input_map() -> void:
    _ensure_key_action("move_forward", KEY_W)
    _ensure_key_action("move_back", KEY_S)
    _ensure_key_action("move_left", KEY_A)
    _ensure_key_action("move_right", KEY_D)
    _ensure_key_action("interact", KEY_E)
    _ensure_key_action("jump", KEY_SPACE)
    _ensure_key_action("toggle_mouse", KEY_F2)
    _ensure_key_action("switch_presentation", KEY_TAB)
    _ensure_key_action("return_to_hub", KEY_ESCAPE)

    _ensure_joy_axis("move_left", JOY_AXIS_LEFT_X, -1.0)
    _ensure_joy_axis("move_right", JOY_AXIS_LEFT_X, 1.0)
    _ensure_joy_axis("move_forward", JOY_AXIS_LEFT_Y, -1.0)
    _ensure_joy_axis("move_back", JOY_AXIS_LEFT_Y, 1.0)
    _ensure_joy_button("switch_presentation", JOY_BUTTON_Y)
    _ensure_joy_button("return_to_hub", JOY_BUTTON_BACK)

func _ensure_key_action(action: StringName, keycode: Key) -> void:
    if not InputMap.has_action(action):
        InputMap.add_action(action)
    for existing in InputMap.action_get_events(action):
        if existing is InputEventKey and existing.physical_keycode == keycode:
            return
    var event := InputEventKey.new()
    event.physical_keycode = keycode
    InputMap.action_add_event(action, event)

func _ensure_joy_axis(action: StringName, axis: JoyAxis, value: float) -> void:
    if not InputMap.has_action(action):
        InputMap.add_action(action)
    var event := InputEventJoypadMotion.new()
    event.axis = axis
    event.axis_value = value
    InputMap.action_add_event(action, event)

func _ensure_joy_button(action: StringName, button: JoyButton) -> void:
    if not InputMap.has_action(action):
        InputMap.add_action(action)
    for existing in InputMap.action_get_events(action):
        if existing is InputEventJoypadButton and existing.button_index == button:
            return
    var event := InputEventJoypadButton.new()
    event.button_index = button
    InputMap.action_add_event(action, event)
