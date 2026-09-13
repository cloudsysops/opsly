extends Control

@onready var player_card: Panel = $PlayerCard
@onready var player_name: Label = $PlayerCard/Name
@onready var player_hp: ProgressBar = $PlayerCard/HP
@onready var player_sprite: Polygon2D = $PlayerCard/Sprite
@onready var enemy_card: Panel = $EnemyCard
@onready var enemy_name: Label = $EnemyCard/Name
@onready var enemy_hp: ProgressBar = $EnemyCard/HP

func render_battle_state(state: Dictionary, definitions: Dictionary) -> void:
    var player: Array = state.get("player", [])
    var opponent: Array = state.get("opponent", [])
    var active_player := _first_alive(player)
    var active_opponent := _first_alive(opponent)
    if not active_player.is_empty():
        _render_card(active_player, definitions, player_name, player_hp)
    if not active_opponent.is_empty():
        _render_card(active_opponent, definitions, enemy_name, enemy_hp)

func _first_alive(fighters: Array) -> Dictionary:
    for fighter in fighters:
        if fighter is Dictionary and float(fighter.get("health", 0)) > 0.0:
            return fighter
    if not fighters.is_empty() and fighters[0] is Dictionary:
        return fighters[0]
    return {}

func _render_card(
    fighter: Dictionary,
    definitions: Dictionary,
    label: Label,
    hp: ProgressBar
) -> void:
    var id := str(fighter.get("fighter_id", ""))
    var definition: Dictionary = definitions.get(id, {})
    label.text = str(definition.get("name", id))
    hp.max_value = float(definition.get("maxHealth", 100))
    hp.value = float(fighter.get("health", 0))


func apply_player_color(html_color: String) -> void:
    player_sprite.color = Color.from_string(html_color, player_sprite.color)
