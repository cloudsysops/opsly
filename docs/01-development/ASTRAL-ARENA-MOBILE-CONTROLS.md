# Astral Arena — Mobile gameplay controls

The browser build now has first-class on-screen controls.

## 2D world

Left D-pad:
- forward/up;
- back/down;
- left;
- right.

Actions:
- Interact;
- Menu.

## 3D Crystal Temple

Left D-pad:
- character movement.

Right D-pad:
- camera look.

Actions:
- Interact;
- Jump;
- Menu.

The controls emit the same Godot InputMap actions as keyboard/gamepad. There is no
separate mobile gameplay state.

## Input contract

Movement:
- move_forward
- move_back
- move_left
- move_right

Camera:
- look_up
- look_down
- look_left
- look_right

Actions:
- interact
- jump
- return_to_hub

Keyboard/gamepad remain supported in parallel.

## Orientation

Landscape is the primary mobile gameplay orientation.
