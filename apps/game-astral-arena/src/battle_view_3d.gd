extends Node3D

@onready var player_mesh: MeshInstance3D = $PlayerPedestal/PlayerMesh
@onready var enemy_mesh: MeshInstance3D = $EnemyPedestal/EnemyMesh
@onready var player_hp: Label3D = $PlayerPedestal/HP
@onready var enemy_hp: Label3D = $EnemyPedestal/HP

func render_battle_state(state: Dictionary, definitions: Dictionary) -> void:
    var player: Array = state.get("player", [])
    var opponent: Array = state.get("opponent", [])

    if not player.is_empty():
        var p: Dictionary = player[0]
        var pd: Dictionary = definitions.get(str(p.get("fighter_id", "")), {})
        player_hp.text = "%s\nHP %d / %d" % [
            str(pd.get("name", p.get("fighter_id", "?"))),
            int(p.get("health", 0)),
            int(pd.get("maxHealth", 100))
        ]
        var p_ratio := clamp(
            float(p.get("health", 0)) / max(1.0, float(pd.get("maxHealth", 100))),
            0.15,
            1.0
        )
        player_mesh.scale = Vector3.ONE * p_ratio

    if not opponent.is_empty():
        var e: Dictionary = opponent[0]
        var ed: Dictionary = definitions.get(str(e.get("fighter_id", "")), {})
        enemy_hp.text = "%s\nHP %d / %d" % [
            str(ed.get("name", e.get("fighter_id", "?"))),
            int(e.get("health", 0)),
            int(ed.get("maxHealth", 100))
        ]
        var e_ratio := clamp(
            float(e.get("health", 0)) / max(1.0, float(ed.get("maxHealth", 100))),
            0.15,
            1.0
        )
        enemy_mesh.scale = Vector3.ONE * e_ratio


func apply_player_color(html_color: String) -> void:
    var color := Color.from_string(html_color, Color(0.45, 0.15, 0.92, 1))
    var material := StandardMaterial3D.new()
    material.albedo_color = color
    material.emission_enabled = true
    material.emission = color.darkened(0.45)
    material.emission_energy_multiplier = 2.0
    player_mesh.material_override = material
