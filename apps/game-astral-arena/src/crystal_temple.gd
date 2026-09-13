extends Node3D

@onready var mission_label: Label = $UI/Margin/VBox/Mission
@onready var step_label: Label = $UI/Margin/VBox/Step
@onready var interaction_label: Label = $UI/Margin/VBox/Interaction
@onready var crystal_one: Area3D = $Temple/CrystalOne
@onready var crystal_two: Area3D = $Temple/CrystalTwo

var content_pack: Dictionary = {}
var mission: Dictionary = {}
var current_step := 0
var nearby_crystal := ""

func _ready() -> void:
    content_pack = ProjectSettings.get_setting("astral_arena/runtime/content_pack", {})
    mission = _find_mission("awakening-sisters-001")
    _refresh_ui()

    crystal_one.body_entered.connect(func(body): _on_crystal_entered(body, "arena"))
    crystal_one.body_exited.connect(func(body): _on_crystal_exited(body, "arena"))
    crystal_two.body_entered.connect(func(body): _on_crystal_entered(body, "brissa"))
    crystal_two.body_exited.connect(func(body): _on_crystal_exited(body, "brissa"))

func _process(_delta: float) -> void:
    if nearby_crystal != "" and Input.is_action_just_pressed("interact"):
        _activate_crystal(nearby_crystal)

func _find_mission(id: String) -> Dictionary:
    for item in content_pack.get("missions", []):
        if item.get("id", "") == id:
            return item
    return {}

func _on_crystal_entered(body: Node, crystal_id: String) -> void:
    if body.name != "Player":
        return
    nearby_crystal = crystal_id
    interaction_label.text = "E / interactuar — activar cristal de %s" % crystal_id.capitalize()

func _on_crystal_exited(body: Node, crystal_id: String) -> void:
    if body.name != "Player" or nearby_crystal != crystal_id:
        return
    nearby_crystal = ""
    interaction_label.text = ""

func _activate_crystal(crystal_id: String) -> void:
    if mission.is_empty():
        return

    if crystal_id == "arena":
        current_step = max(current_step, 2)
        $Temple/CrystalOne/Glow.visible = true
    elif crystal_id == "brissa":
        current_step = max(current_step, 3)
        $Temple/CrystalTwo/Glow.visible = true

    _refresh_ui()

func _refresh_ui() -> void:
    if mission.is_empty():
        mission_label.text = "Contenido de misión no disponible"
        step_label.text = ""
        return

    mission_label.text = mission.get("title", "Dos Firmas Astrales")
    var steps: Array = mission.get("steps", [])
    var idx := clamp(current_step, 0, max(steps.size() - 1, 0))
    if steps.is_empty():
        step_label.text = ""
    else:
        step_label.text = "Objetivo: " + str(steps[idx].get("prompt", ""))

    if current_step >= 3:
        interaction_label.text = "Primer vínculo completado — el Templo está despertando."


func _unhandled_input(event: InputEvent) -> void:
    if event.is_action_pressed("return_to_hub"):
        get_tree().change_scene_to_file("res://scenes/mode_hub.tscn")
