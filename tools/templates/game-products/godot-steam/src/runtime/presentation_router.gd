class_name OpslyPresentationRouter
extends Node

signal mode_changed(mode: String)
signal shared_state_changed(state: Dictionary)

const VALID_MODES := ["2D", "3D", "HYBRID"]

var current_mode := "3D"
var shared_state: Dictionary = {}

func bind_state(state: Dictionary) -> void:
    shared_state = state
    shared_state_changed.emit(shared_state)

func replace_state(state: Dictionary) -> void:
    shared_state = state
    shared_state_changed.emit(shared_state)

func patch_state(patch: Dictionary) -> void:
    for key in patch.keys():
        shared_state[key] = patch[key]
    shared_state_changed.emit(shared_state)

func set_mode(mode: String) -> void:
    if not VALID_MODES.has(mode):
        push_error("Unsupported presentation mode: %s" % mode)
        return
    current_mode = mode
    mode_changed.emit(current_mode)
    shared_state_changed.emit(shared_state)

func toggle_2d_3d() -> void:
    set_mode("3D" if current_mode == "2D" else "2D")

func snapshot() -> Dictionary:
    return shared_state.duplicate(true)
