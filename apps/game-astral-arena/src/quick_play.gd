extends Control

@onready var mode_select: Button = $Center/VBox/Mode
@onready var guardian_select: Button = $Center/VBox/Guardian
@onready var companion_select: Button = $Center/VBox/Companion
@onready var aura_select: Button = $Center/VBox/Aura
@onready var nickname_input: LineEdit = $Center/VBox/Nickname
@onready var companion_name_input: LineEdit = $Center/VBox/CompanionName
@onready var summary: Label = $Center/VBox/Summary

var pack: Dictionary = {}
var companions: Array = []

var mode_index := 1
var guardian_index := 0
var companion_index := 0
var aura_index := 0

const MODES := [
    {"id": "SINGLE_PLAYER", "label": "1 jugador · Guardián + compañero"},
    {"id": "SISTERS_COOP", "label": "2 jugadores local · Arena + Brissa + compañero"},
]

const GUARDIANS := [
    {"id": "arena", "label": "Arena · Tejedora del Nexo"},
    {"id": "brissa", "label": "Brissa · Guardiana de las Constelaciones"},
]

const AURAS := [
    {"id": "purple-gold", "label": "Púrpura + Oro", "color": "#8b5cf6"},
    {"id": "blue-pink", "label": "Azul + Rosa", "color": "#3b82f6"},
    {"id": "emerald", "label": "Esmeralda", "color": "#10b981"},
    {"id": "solar", "label": "Solar Dorado", "color": "#f59e0b"},
]

func _ready() -> void:
    pack = ProjectSettings.get_setting("astral_arena/runtime/content_pack", {})
    companions = pack.get("companions", [])

    mode_select.pressed.connect(_cycle_mode)
    guardian_select.pressed.connect(_cycle_guardian)
    companion_select.pressed.connect(_cycle_companion)
    aura_select.pressed.connect(_cycle_aura)

    nickname_input.text_changed.connect(func(_value): _refresh_summary())
    companion_name_input.text_changed.connect(func(_value): _refresh_summary())

    $Center/VBox/Start.pressed.connect(_start_battle)
    $Center/VBox/Back.pressed.connect(func():
        get_tree().change_scene_to_file("res://scenes/mode_hub.tscn")
    )

    if not companions.is_empty():
        companion_name_input.text = str(_selected_companion().get("name", ""))

    _refresh_selector_labels()
    _refresh_summary()

func _cycle_mode() -> void:
    mode_index = (mode_index + 1) % MODES.size()
    _refresh_selector_labels()
    _refresh_summary()

func _cycle_guardian() -> void:
    guardian_index = (guardian_index + 1) % GUARDIANS.size()
    _refresh_selector_labels()
    _refresh_summary()

func _cycle_companion() -> void:
    if companions.is_empty():
        return
    companion_index = (companion_index + 1) % companions.size()
    companion_name_input.text = str(_selected_companion().get("name", ""))
    _refresh_selector_labels()
    _refresh_summary()

func _cycle_aura() -> void:
    aura_index = (aura_index + 1) % AURAS.size()
    _refresh_selector_labels()
    _refresh_summary()

func _refresh_selector_labels() -> void:
    var mode: Dictionary = MODES[mode_index]
    var guardian: Dictionary = GUARDIANS[guardian_index]
    var companion := _selected_companion()
    var aura: Dictionary = AURAS[aura_index]

    mode_select.text = "MODO  ◀  %s  ▶" % str(mode["label"])
    guardian_select.text = "GUARDIÁN  ◀  %s  ▶" % str(guardian["label"])
    companion_select.text = "COMPAÑERO  ◀  %s · %s  ▶" % [
        str(companion.get("name", "Orion")),
        str(companion.get("family", "REAL_PET"))
    ]
    aura_select.text = "AURA  ◀  %s  ▶" % str(aura["label"])

func _start_battle() -> void:
    var guardian: Dictionary = GUARDIANS[guardian_index]
    var companion := _selected_companion()
    var aura: Dictionary = AURAS[aura_index]
    var mode: Dictionary = MODES[mode_index]

    ProjectSettings.set_setting("astral_arena/session/guardian_id", guardian["id"])
    ProjectSettings.set_setting("astral_arena/session/companion_id", companion.get("id", "orion-shepherd"))
    ProjectSettings.set_setting("astral_arena/session/aura_id", aura["id"])
    ProjectSettings.set_setting("astral_arena/session/aura_color", aura["color"])
    ProjectSettings.set_setting("astral_arena/session/play_mode", mode["id"])
    ProjectSettings.set_setting(
        "astral_arena/session/player_nickname",
        nickname_input.text.strip_edges()
    )
    ProjectSettings.set_setting(
        "astral_arena/session/companion_nickname",
        companion_name_input.text.strip_edges()
    )

    get_tree().change_scene_to_file("res://scenes/hybrid_battle_lab.tscn")

func _selected_companion() -> Dictionary:
    if companions.is_empty():
        return {"id": "orion-shepherd", "name": "Orion", "family": "REAL_PET"}
    return companions[clamp(companion_index, 0, companions.size() - 1)]

func _refresh_summary() -> void:
    var guardian: Dictionary = GUARDIANS[guardian_index]
    var companion := _selected_companion()
    var aura: Dictionary = AURAS[aura_index]
    var mode_text := "Arena + Brissa cooperativo" if mode_index == 1 else str(guardian["label"])
    var player_name := nickname_input.text.strip_edges()
    var companion_name := companion_name_input.text.strip_edges()

    if companion_name == "":
        companion_name = str(companion.get("name", "Orion"))

    summary.text = "%s%s\nCompañero: %s · %s\nAura: %s\n\nToca una opción para cambiarla · 2D ↔ 3D dentro de batalla." % [
        mode_text,
        (" · " + player_name) if player_name != "" else "",
        companion_name,
        companion.get("family", "REAL_PET"),
        aura["label"]
    ]
