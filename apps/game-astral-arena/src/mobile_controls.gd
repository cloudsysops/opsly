extends Control

@export var show_look_controls := true
@export var show_jump := true
@export var show_interact := true

var held_actions: Dictionary = {}

func _ready() -> void:
    visible = OS.has_feature("web") or DisplayServer.is_touchscreen_available()

    $Move/Up.button_down.connect(func(): _press("move_forward"))
    $Move/Up.button_up.connect(func(): _release("move_forward"))
    $Move/Down.button_down.connect(func(): _press("move_back"))
    $Move/Down.button_up.connect(func(): _release("move_back"))
    $Move/Left.button_down.connect(func(): _press("move_left"))
    $Move/Left.button_up.connect(func(): _release("move_left"))
    $Move/Right.button_down.connect(func(): _press("move_right"))
    $Move/Right.button_up.connect(func(): _release("move_right"))

    $Look.visible = show_look_controls
    if show_look_controls:
        $Look/Up.button_down.connect(func(): _press("look_up"))
        $Look/Up.button_up.connect(func(): _release("look_up"))
        $Look/Down.button_down.connect(func(): _press("look_down"))
        $Look/Down.button_up.connect(func(): _release("look_down"))
        $Look/Left.button_down.connect(func(): _press("look_left"))
        $Look/Left.button_up.connect(func(): _release("look_left"))
        $Look/Right.button_down.connect(func(): _press("look_right"))
        $Look/Right.button_up.connect(func(): _release("look_right"))

    $Actions/Jump.visible = show_jump
    $Actions/Interact.visible = show_interact

    $Actions/Jump.pressed.connect(func(): _tap("jump"))
    $Actions/Interact.pressed.connect(func(): _tap("interact"))
    $Actions/Menu.pressed.connect(func(): _tap("return_to_hub"))

func _exit_tree() -> void:
    for action in held_actions.keys():
        Input.action_release(action)
    held_actions.clear()

func _press(action: StringName) -> void:
    held_actions[action] = true
    Input.action_press(action)

func _release(action: StringName) -> void:
    held_actions.erase(action)
    Input.action_release(action)

func _tap(action: StringName) -> void:
    Input.action_press(action)
    await get_tree().process_frame
    Input.action_release(action)
