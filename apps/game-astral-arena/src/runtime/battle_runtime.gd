class_name OpslyBattleRuntime
extends RefCounted

var fighter_defs: Dictionary = {}
var ruleset: Dictionary = {}
var state: Dictionary = {}

func configure(pack: Dictionary) -> void:
    fighter_defs.clear()
    var battle: Dictionary = pack.get("battle", {})
    ruleset = battle.get("ruleset", {})
    for raw_fighter in battle.get("fighters", []):
        var fighter: Dictionary = raw_fighter
        fighter_defs[str(fighter.get("id", ""))] = fighter

func start(player_ids: Array, opponent_ids: Array) -> Dictionary:
    state = {
        "round": 1,
        "active_side": "PLAYER",
        "player": _make_side(player_ids),
        "opponent": _make_side(opponent_ids),
        "log": ["Astral Duel iniciado."],
        "winner": ""
    }
    return snapshot()

func snapshot() -> Dictionary:
    return state.duplicate(true)

func perform_player_action(ability_id: String) -> Dictionary:
    if state.is_empty() or str(state.get("winner", "")) != "":
        return snapshot()

    var actor := _first_alive(state.get("player", []))
    var target := _first_alive(state.get("opponent", []))
    if actor.is_empty() or target.is_empty():
        _refresh_winner()
        return snapshot()

    _perform_action(actor, target, ability_id, "Guardianes")
    _refresh_winner()

    if str(state.get("winner", "")) == "":
        _perform_enemy_turn()
        _regenerate_energy()
        _refresh_winner()
        state["round"] = int(state.get("round", 1)) + 1

    return snapshot()

func definition_for(fighter_id: String) -> Dictionary:
    return fighter_defs.get(fighter_id, {}).duplicate(true)

func ability_list_for(fighter_id: String) -> Array:
    var definition: Dictionary = fighter_defs.get(fighter_id, {})
    return definition.get("abilities", []).duplicate(true)

func _make_side(ids: Array) -> Array:
    var side: Array = []
    for raw_id in ids:
        var id := str(raw_id)
        var definition: Dictionary = fighter_defs.get(id, {})
        if definition.is_empty():
            continue
        side.append({
            "fighter_id": id,
            "health": int(definition.get("maxHealth", 100)),
            "energy": int(definition.get("maxEnergy", 100)),
            "defending": false,
            "control": 0
        })
    return side

func _first_alive(side: Array) -> Dictionary:
    for raw_fighter in side:
        var fighter: Dictionary = raw_fighter
        if int(fighter.get("health", 0)) > 0:
            return fighter
    return {}

func _ability(fighter_id: String, ability_id: String) -> Dictionary:
    var definition: Dictionary = fighter_defs.get(fighter_id, {})
    for raw_ability in definition.get("abilities", []):
        var ability: Dictionary = raw_ability
        if str(ability.get("id", "")) == ability_id:
            return ability
    return {}

func _perform_action(actor: Dictionary, target: Dictionary, ability_id: String, side_label: String) -> void:
    var actor_id := str(actor.get("fighter_id", ""))
    var ability := _ability(actor_id, ability_id)
    if ability.is_empty():
        _append_log("%s no conoce esa habilidad." % side_label)
        return

    var cost := int(ability.get("energyCost", 0))
    if int(actor.get("energy", 0)) < cost:
        _append_log("%s no tiene energía suficiente." % side_label)
        return

    actor["energy"] = int(actor.get("energy", 0)) - cost
    var kind := str(ability.get("kind", "ATTACK"))
    var power := int(ability.get("power", 0))
    var ability_name := str(ability.get("name", ability_id))

    match kind:
        "DEFEND":
            actor["defending"] = true
            _append_log("%s usa %s." % [side_label, ability_name])
        "SUPPORT":
            var definition: Dictionary = fighter_defs.get(actor_id, {})
            actor["health"] = min(
                int(definition.get("maxHealth", 100)),
                int(actor.get("health", 0)) + power
            )
            actor["energy"] = min(
                int(definition.get("maxEnergy", 100)),
                int(actor.get("energy", 0)) + max(6, int(power / 2))
            )
            _append_log("%s usa %s y restaura el Nexo." % [side_label, ability_name])
        "CONTROL":
            target["control"] = min(2, int(target.get("control", 0)) + 1)
            var control_damage := max(1, int(power / 2))
            _apply_damage(target, control_damage)
            _append_log("%s usa %s y altera el ritmo rival." % [side_label, ability_name])
        _:
            _apply_damage(target, power)
            _append_log("%s usa %s: %d de impacto." % [side_label, ability_name, power])

func _apply_damage(target: Dictionary, power: int) -> void:
    var damage := power
    if bool(target.get("defending", false)):
        var reduction := float(ruleset.get("defenseReductionPercent", 45)) / 100.0
        damage = max(1, int(round(float(damage) * (1.0 - reduction))))
        target["defending"] = false
    if int(target.get("control", 0)) > 0:
        damage += 3
        target["control"] = max(0, int(target.get("control", 0)) - 1)
    target["health"] = max(0, int(target.get("health", 0)) - damage)

func _perform_enemy_turn() -> void:
    var actor := _first_alive(state.get("opponent", []))
    var target := _first_alive(state.get("player", []))
    if actor.is_empty() or target.is_empty():
        return

    var definition: Dictionary = fighter_defs.get(str(actor.get("fighter_id", "")), {})
    var abilities: Array = definition.get("abilities", [])
    if abilities.is_empty():
        return

    var chosen: Dictionary = abilities[0]
    for raw_candidate in abilities:
        var candidate: Dictionary = raw_candidate
        if int(actor.get("energy", 0)) >= int(candidate.get("energyCost", 0)):
            chosen = candidate
            break

    _perform_action(actor, target, str(chosen.get("id", "")), "Sombra")

func _regenerate_energy() -> void:
    var regen := int(ruleset.get("energyRegenerationPerTurn", 12))
    for side_name in ["player", "opponent"]:
        for raw_fighter in state.get(side_name, []):
            var fighter: Dictionary = raw_fighter
            var definition: Dictionary = fighter_defs.get(str(fighter.get("fighter_id", "")), {})
            fighter["energy"] = min(
                int(definition.get("maxEnergy", 100)),
                int(fighter.get("energy", 0)) + regen
            )

func _refresh_winner() -> void:
    if _first_alive(state.get("opponent", [])).is_empty():
        state["winner"] = "PLAYER"
    elif _first_alive(state.get("player", [])).is_empty():
        state["winner"] = "OPPONENT"

func _append_log(message: String) -> void:
    var log: Array = state.get("log", [])
    log.append(message)
    if log.size() > 8:
        log.pop_front()
    state["log"] = log
