extends Control

func _ready() -> void:
    $Center/VBox/Story3D.pressed.connect(func():
        get_tree().change_scene_to_file("res://scenes/crystal_temple.tscn")
    )
    $Center/VBox/World2D.pressed.connect(func():
        get_tree().change_scene_to_file("res://scenes/world_2d.tscn")
    )
    $Center/VBox/HybridBattle.pressed.connect(func():
        get_tree().change_scene_to_file("res://scenes/hybrid_battle_lab.tscn")
    )

func _unhandled_input(event: InputEvent) -> void:
    if event.is_action_pressed("return_to_hub"):
        get_viewport().set_input_as_handled()
