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
    if not player.is_empty():
        _render_card(player[0], definitions, player_name, player_hp)
    if not opponent.is_empty():
        _render_card(opponent[0], definitions, enemy_name, enemy_hp)

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
