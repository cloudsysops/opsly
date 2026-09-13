extends Node

const BattleRuntime = preload("res://src/runtime/battle_runtime.gd")

@onready var view_2d: Control = $View2D
@onready var view_3d: Node3D = $View3D
@onready var mode_label: Label = $HUD/Top/Mode
@onready var round_label: Label = $HUD/Top/Round
@onready var player_label: Label = $HUD/Top/PlayerStats
@onready var enemy_label: Label = $HUD/Top/EnemyStats
@onready var log_label: Label = $HUD/Bottom/Log
@onready var ability_box: HFlowContainer = $HUD/Bottom/Abilities

var runtime := BattleRuntime.new()
var current_mode := "2D"
var pack: Dictionary = {}
var state: Dictionary = {}

func _ready() -> void:
    pack = ProjectSettings.get_setting("astral_arena/runtime/content_pack", {})
    runtime.configure(pack)
    var first_encounter: Dictionary = pack.get("battle", {}).get("first_encounter", {})
    var guardian_id := str(ProjectSettings.get_setting(
        "astral_arena/session/guardian_id",
        first_encounter.get("player", ["arena"])[0]
    ))
    var companion_id := str(ProjectSettings.get_setting(
        "astral_arena/session/companion_id",
        "orion-shepherd"
    ))
    var play_mode := str(ProjectSettings.get_setting(
        "astral_arena/session/play_mode",
        "SINGLE_PLAYER"
    ))
    var player_party: Array = [guardian_id, companion_id]
    if play_mode == "SISTERS_COOP":
        player_party = ["arena", "brissa", companion_id]

    state = runtime.start(
        player_party,
        first_encounter.get("opponent", ["shadow-scout"])
    )
    $HUD/Actions/SwitchView.pressed.connect(func():
        _set_mode("3D" if current_mode == "2D" else "2D")
    )
    $HUD/Actions/Restart.pressed.connect(_restart_battle)
    $HUD/Actions/Home.pressed.connect(func():
        get_tree().change_scene_to_file("res://scenes/mode_hub.tscn")
    )

    _build_ability_buttons()
    _set_mode("2D")
    _refresh_views()

func _unhandled_input(event: InputEvent) -> void:
    if event.is_action_pressed("switch_presentation"):
        _set_mode("3D" if current_mode == "2D" else "2D")
        get_viewport().set_input_as_handled()
    elif event.is_action_pressed("return_to_hub"):
        get_tree().change_scene_to_file("res://scenes/mode_hub.tscn")

func _set_mode(mode: String) -> void:
    current_mode = mode
    view_2d.visible = mode == "2D"
    view_3d.visible = mode == "3D"
    mode_label.text = "PRESENTACIÓN: %s · TAB cambia sin reiniciar batalla" % mode
    _refresh_views()

func _build_ability_buttons() -> void:
    for child in ability_box.get_children():
        child.queue_free()

    var player: Array = state.get("player", [])
    if player.is_empty():
        return

    for index in range(player.size()):
        var fighter: Dictionary = player[index]
        var prefix := "COMPAÑERO"
        var fighter_id := str(fighter.get("fighter_id", ""))
        if fighter_id == "arena":
            prefix = "ARENA"
        elif fighter_id == "brissa":
            prefix = "BRISSA"
        _append_fighter_buttons(fighter, prefix)

func _append_fighter_buttons(fighter: Dictionary, prefix: String) -> void:
    var fighter_id := str(fighter.get("fighter_id", ""))
    var abilities := runtime.ability_list_for(fighter_id)
    var max_buttons := min(3, abilities.size())
    for index in range(max_buttons):
        var ability: Dictionary = abilities[index]
        var button := Button.new()
        button.custom_minimum_size = Vector2(250, 48)
        button.add_theme_font_size_override("font_size", 16)
        button.text = "%s · %s · %d⚡" % [
            prefix,
            str(ability.get("name", ability.get("id", "?"))),
            int(ability.get("energyCost", 0))
        ]
        var action_fighter_id := fighter_id
        var action_ability_id := str(ability.get("id", ""))
        button.pressed.connect(
            _use_fighter_ability.bind(action_fighter_id, action_ability_id)
        )
        ability_box.add_child(button)

func _use_ability(ability_id: String) -> void:
    state = runtime.perform_player_action(ability_id)
    _refresh_views()

func _use_fighter_ability(fighter_id: String, ability_id: String) -> void:
    state = runtime.perform_player_action_for(fighter_id, ability_id)
    _refresh_views()

func _refresh_views() -> void:
    if state.is_empty():
        return

    round_label.text = "RONDA %d" % int(state.get("round", 1))
    player_label.text = _side_summary(state.get("player", []))
    enemy_label.text = _side_summary(state.get("opponent", []))

    var log: Array = state.get("log", [])
    log_label.text = "\n".join(log)

    view_2d.call("render_battle_state", state, runtime.fighter_defs)
    view_3d.call("render_battle_state", state, runtime.fighter_defs)

    var aura_color := str(ProjectSettings.get_setting(
        "astral_arena/session/aura_color",
        "#8b5cf6"
    ))
    if view_2d.has_method("apply_player_color"):
        view_2d.call("apply_player_color", aura_color)
    if view_3d.has_method("apply_player_color"):
        view_3d.call("apply_player_color", aura_color)

    var winner := str(state.get("winner", ""))
    if winner != "":
        mode_label.text = "BATALLA TERMINADA · GANADOR: %s · vista actual %s" % [winner, current_mode]

func _side_summary(side: Array) -> String:
    var parts: Array[String] = []
    for raw_fighter in side:
        var fighter: Dictionary = raw_fighter
        var definition: Dictionary = runtime.definition_for(str(fighter.get("fighter_id", "")))
        parts.append("%s HP:%d EN:%d" % [
            str(definition.get("name", fighter.get("fighter_id", "?"))),
            int(fighter.get("health", 0)),
            int(fighter.get("energy", 0))
        ])
    return " · ".join(parts)


func _restart_battle() -> void:
    get_tree().reload_current_scene()
