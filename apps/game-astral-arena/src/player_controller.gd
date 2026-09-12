extends CharacterBody3D

@export var speed := 6.0
@export var acceleration := 18.0
@export var jump_velocity := 5.2
@export var mouse_sensitivity := 0.0025
@export var gamepad_look_speed := 2.4

@onready var camera_pivot: Node3D = $CameraPivot
@onready var camera: Camera3D = $CameraPivot/Camera3D

var gravity: float = ProjectSettings.get_setting("physics/3d/default_gravity", 9.8)
var mouse_captured := true

func _ready() -> void:
    Input.set_mouse_mode(Input.MOUSE_MODE_CAPTURED)
    camera.current = true

func _unhandled_input(event: InputEvent) -> void:
    if event.is_action_pressed("toggle_mouse"):
        mouse_captured = not mouse_captured
        Input.set_mouse_mode(
            Input.MOUSE_MODE_CAPTURED if mouse_captured else Input.MOUSE_MODE_VISIBLE
        )

    if event is InputEventMouseMotion and mouse_captured:
        rotate_y(-event.relative.x * mouse_sensitivity)
        camera_pivot.rotate_x(-event.relative.y * mouse_sensitivity)
        camera_pivot.rotation.x = clamp(camera_pivot.rotation.x, -1.15, 0.85)

func _physics_process(delta: float) -> void:
    if not is_on_floor():
        velocity.y -= gravity * delta

    if Input.is_action_just_pressed("jump") and is_on_floor():
        velocity.y = jump_velocity

    var input_2d := Input.get_vector("move_left", "move_right", "move_forward", "move_back")
    var direction := (transform.basis * Vector3(input_2d.x, 0.0, input_2d.y)).normalized()
    var target := direction * speed

    velocity.x = move_toward(velocity.x, target.x, acceleration * delta)
    velocity.z = move_toward(velocity.z, target.z, acceleration * delta)

    var joy_look := Vector2(
        Input.get_joy_axis(0, JOY_AXIS_RIGHT_X),
        Input.get_joy_axis(0, JOY_AXIS_RIGHT_Y)
    )
    if joy_look.length() > 0.18:
        rotate_y(-joy_look.x * gamepad_look_speed * delta)
        camera_pivot.rotate_x(-joy_look.y * gamepad_look_speed * delta)
        camera_pivot.rotation.x = clamp(camera_pivot.rotation.x, -1.15, 0.85)

    move_and_slide()
