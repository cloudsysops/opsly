extends Control

func _ready() -> void:
    $Center/VBox/QuickPlay.pressed.connect(func():
        get_tree().change_scene_to_file("res://scenes/quick_play.tscn")
    )
    $Center/VBox/Story3D.pressed.connect(func():
        get_tree().change_scene_to_file("res://scenes/crystal_temple.tscn")
    )
    $Center/VBox/World2D.pressed.connect(func():
        get_tree().change_scene_to_file("res://scenes/world_2d.tscn")
    )
    $Center/VBox/HybridBattle.pressed.connect(func():
        get_tree().change_scene_to_file("res://scenes/hybrid_battle_lab.tscn")
    )
    $Center/VBox/GamesLab.pressed.connect(_open_games_lab)

func _unhandled_input(event: InputEvent) -> void:
    if event.is_action_pressed("return_to_hub"):
        get_viewport().set_input_as_handled()


func _open_games_lab() -> void:
    if OS.has_feature("web"):
        JavaScriptBridge.eval("""
            (() => {
              const path = window.location.pathname.endsWith('/')
                ? window.location.pathname
                : window.location.pathname.replace(/[^/]*$/, '');
              window.location.href = path + 'games/';
            })();
        """)
    else:
        OS.shell_open("https://astral-arena.op-sly.com/games/")
