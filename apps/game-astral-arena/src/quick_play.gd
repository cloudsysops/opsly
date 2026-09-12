extends Control

@onready var guardian_select: OptionButton = $Center/VBox/Guardian
@onready var companion_select: OptionButton = $Center/VBox/Companion
@onready var aura_select: OptionButton = $Center/VBox/Aura
@onready var summary: Label = $Center/VBox/Summary

var pack: Dictionary = {}
var companions: Array = []

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

    guardian_select.clear()
    for guardian in GUARDIANS:
        guardian_select.add_item(str(guardian["label"]))
    guardian_select.select(0)

    companion_select.clear()
    for companion in companions:
        companion_select.add_item(
            "%s · %s" % [
                str(companion.get("name", "?")),
                str(companion.get("family", "COMPANION"))
            ]
        )
    if companion_select.item_count > 0:
        companion_select.select(0)

    aura_select.clear()
    for aura in AURAS:
        aura_select.add_item(str(aura["label"]))
    aura_select.select(0)

    guardian_select.item_selected.connect(func(_index): _refresh_summary())
    companion_select.item_selected.connect(func(_index): _refresh_summary())
    aura_select.item_selected.connect(func(_index): _refresh_summary())
    $Center/VBox/Start.pressed.connect(_start_battle)
    $Center/VBox/Back.pressed.connect(func():
        get_tree().change_scene_to_file("res://scenes/mode_hub.tscn")
    )

    _refresh_summary()

func _start_battle() -> void:
    var guardian := GUARDIANS[guardian_select.selected]
    var companion := _selected_companion()
    var aura := AURAS[aura_select.selected]

    ProjectSettings.set_setting("astral_arena/session/guardian_id", guardian["id"])
    ProjectSettings.set_setting("astral_arena/session/companion_id", companion.get("id", "orion-shepherd"))
    ProjectSettings.set_setting("astral_arena/session/aura_id", aura["id"])
    ProjectSettings.set_setting("astral_arena/session/aura_color", aura["color"])
    ProjectSettings.set_setting("astral_arena/session/play_mode", "SINGLE_PLAYER")

    get_tree().change_scene_to_file("res://scenes/hybrid_battle_lab.tscn")

func _selected_companion() -> Dictionary:
    if companions.is_empty():
        return {"id": "orion-shepherd", "name": "Orion", "family": "REAL_PET"}
    return companions[clamp(companion_select.selected, 0, companions.size() - 1)]

func _refresh_summary() -> void:
    var guardian := GUARDIANS[guardian_select.selected]
    var companion := _selected_companion()
    var aura := AURAS[aura_select.selected]
    summary.text = "%s\nCompañero: %s · %s\nAura: %s\n\nLa batalla puede cambiar 2D ↔ 3D con TAB sin reiniciarse." % [
        guardian["label"],
        companion.get("name", "Orion"),
        companion.get("family", "REAL_PET"),
        aura["label"]
    ]
