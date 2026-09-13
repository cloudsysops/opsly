extends Node2D

@onready var player: CharacterBody2D = $Player
@onready var hint: Label = $UI/Hint

var speed := 260.0
var near_gate := false

func _physics_process(_delta: float) -> void:
    var axis := Input.get_vector("move_left", "move_right", "move_forward", "move_back")
    player.velocity = axis * speed
    player.move_and_slide()

func _process(_delta: float) -> void:
    if near_gate and Input.is_action_just_pressed("interact"):
        get_tree().change_scene_to_file("res://scenes/hybrid_battle_lab.tscn")

func _ready() -> void:
    $BattleGate.body_entered.connect(func(body):
        if body == player:
            near_gate = true
            hint.text = "Toca INTERACTUAR para entrar al Battle Lab híbrido"
    )
    $BattleGate.body_exited.connect(func(body):
        if body == player:
            near_gate = false
            hint.text = "Explora el mapa 2D · usa las flechas táctiles"
    )

func _unhandled_input(event: InputEvent) -> void:
    if event.is_action_pressed("return_to_hub"):
        get_tree().change_scene_to_file("res://scenes/mode_hub.tscn")
