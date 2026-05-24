/**
 * GOAP (Goal-Oriented Action Planning) Planner for Opsly Hive
 *
 * Implementación de A* search para descomposición óptima de objetivos.
 * Reemplaza la descomposición lineal de QueenBee con planning basado en acciones,
 * precondiciones y efectos.
 *
 * Inspirado en el patrón GOAP de Ruflo (goal.ruv.io) y el algoritmo A* clásico.
 */

import { randomUUID } from 'node:crypto';
import type { BotRole, Subtask } from '../types.js';

export interface GOAPState {
  [key: string]: boolean | number | string;
}

export interface GOAPAction {
  name: string;
  cost: number;
  preconditions: GOAPState;
  effects: GOAPState;
  botRole: BotRole;
  description: string;
}

export interface GOAPNode {
  state: GOAPState;
  action: GOAPAction | null;
  parent: GOAPNode | null;
  cost: number;
  heuristic: number;
  depth: number;
}

export interface GOAPPlan {
  actions: GOAPAction[];
  totalCost: number;
  subtasks: Subtask[];
}

export type HeuristicFn = (current: GOAPState, goal: GOAPState) => number;

export const DEFAULT_ACTIONS: GOAPAction[] = [
  {
    name: 'analyze_requirements',
    cost: 1,
    preconditions: {},
    effects: { requirements_analyzed: true },
    botRole: 'researcher',
    description: 'Analizar requisitos y documentación existente',
  },
  {
    name: 'design_solution',
    cost: 2,
    preconditions: { requirements_analyzed: true },
    effects: { solution_designed: true },
    botRole: 'coder',
    description: 'Diseñar la solución técnica',
  },
  {
    name: 'implement_code',
    cost: 5,
    preconditions: { solution_designed: true },
    effects: { code_implemented: true },
    botRole: 'coder',
    description: 'Implementar el código',
  },
  {
    name: 'write_tests',
    cost: 3,
    preconditions: { code_implemented: true },
    effects: { tests_written: true },
    botRole: 'tester',
    description: 'Escribir pruebas automatizadas',
  },
  {
    name: 'run_tests',
    cost: 1,
    preconditions: { tests_written: true },
    effects: { tests_passed: true, validated: true },
    botRole: 'tester',
    description: 'Ejecutar pruebas y validar',
  },
  {
    name: 'security_review',
    cost: 2,
    preconditions: { code_implemented: true },
    effects: { security_reviewed: true, validated: true },
    botRole: 'security',
    description: 'Revisar seguridad del código',
  },
  {
    name: 'deploy',
    cost: 2,
    preconditions: { validated: true },
    effects: { deployed: true },
    botRole: 'deployer',
    description: 'Desplegar cambios',
  },
  {
    name: 'write_docs',
    cost: 2,
    preconditions: { code_implemented: true },
    effects: { documented: true },
    botRole: 'doc-writer',
    description: 'Escribir documentación',
  },
  {
    name: 'research_topic',
    cost: 2,
    preconditions: {},
    effects: { research_complete: true },
    botRole: 'researcher',
    description: 'Investigar tema o tecnología',
  },
];

export function countMismatchedConditions(state: GOAPState, goal: GOAPState): number {
  let mismatches = 0;
  for (const [key, value] of Object.entries(goal)) {
    if (state[key] !== value) mismatches++;
  }
  return mismatches;
}

export function extractObjectiveConditions(objective: string): GOAPState {
  const d = objective.toLowerCase();
  const conditions: GOAPState = {};

  if (d.includes('test') || d.includes('spec') || d.includes('coverage')) {
    conditions.tests_written = true;
    conditions.tests_passed = true;
  }
  if (d.includes('deploy') || d.includes('release') || d.includes('ship')) {
    conditions.deployed = true;
  }
  if (d.includes('document') || d.includes('readme') || d.includes('doc')) {
    conditions.documented = true;
  }
  if (d.includes('security') || d.includes('vulnerab') || d.includes('audit')) {
    conditions.security_reviewed = true;
  }
  if (d.includes('research') || d.includes('investiga') || d.includes('learn')) {
    conditions.research_complete = true;
  }

  if (Object.keys(conditions).length === 0) {
    conditions.code_implemented = true;
    conditions.validated = true;
  }

  return conditions;
}

export function conditionsMet(state: GOAPState, goal: GOAPState): boolean {
  return Object.entries(goal).every(([key, value]) => state[key] === value);
}

export function applyActionEffects(state: GOAPState, action: GOAPAction): GOAPState {
  const newState = { ...state };
  for (const [key, value] of Object.entries(action.effects)) {
    newState[key] = value;
  }
  return newState;
}

export function getAvailableActions(
  state: GOAPState,
  actions: GOAPAction[]
): GOAPAction[] {
  return actions.filter((action) => {
    return Object.entries(action.preconditions).every(
      ([key, value]) => state[key] === value
    );
  });
}

export function rebuildPlan(node: GOAPNode): GOAPAction[] {
  const actions: GOAPAction[] = [];
  let current: GOAPNode | null = node;
  while (current?.action) {
    actions.unshift(current.action);
    current = current.parent;
  }
  return actions;
}

export function aStarSearch(
  startState: GOAPState,
  goalState: GOAPState,
  actions: GOAPAction[],
  heuristic: HeuristicFn = countMismatchedConditions,
  maxIterations = 1000
): GOAPAction[] | null {
  const startNode: GOAPNode = {
    state: startState,
    action: null,
    parent: null,
    cost: 0,
    heuristic: heuristic(startState, goalState),
    depth: 0,
  };

  const openList: GOAPNode[] = [startNode];
  const visitedKeys = new Set<string>();

  let iterations = 0;

  while (openList.length > 0 && iterations < maxIterations) {
    iterations++;
    openList.sort((a, b) => a.cost + a.heuristic - (b.cost + b.heuristic));
    const current = openList.shift()!;

    if (conditionsMet(current.state, goalState)) {
      return rebuildPlan(current);
    }

    const stateKey = JSON.stringify(
      Object.entries(current.state).sort()
    );
    if (visitedKeys.has(stateKey)) continue;
    visitedKeys.add(stateKey);

    const available = getAvailableActions(current.state, actions);

    for (const action of available) {
      const newState = applyActionEffects(current.state, action);
      const child: GOAPNode = {
        state: newState,
        action,
        parent: current,
        cost: current.cost + action.cost,
        heuristic: heuristic(newState, goalState),
        depth: current.depth + 1,
      };
      openList.push(child);
    }
  }

  return null;
}

export function actionsToSubtasks(
  actions: GOAPAction[],
  hiveTaskId: string,
  objective: string
): Subtask[] {
  const subtasks: Subtask[] = [];
  const actionIdMap = new Map<string, string>();

  for (let i = 0; i < actions.length; i++) {
    const action = actions[i];
    const subtaskId = `${hiveTaskId}-subtask-${i + 1}`;
    actionIdMap.set(action.name, subtaskId);

    const dependencies: string[] = [];
    for (const [precondKey] of Object.entries(action.preconditions)) {
      const depAction = actions
        .slice(0, i)
        .reverse()
        .find((a) => a.effects[precondKey] !== undefined);
      if (depAction) {
        const depId = actionIdMap.get(depAction.name);
        if (depId) dependencies.push(depId);
      }
    }

    subtasks.push({
      id: subtaskId,
      taskId: hiveTaskId,
      parentTaskId: hiveTaskId,
      description: `${action.description}: ${action.name}`,
      assignedBotRole: action.botRole,
      status: 'pending',
      dependencies,
      createdAt: new Date(),
    });
  }

  return subtasks;
}

export function generateGOAPPlan(
  objective: string,
  hiveTaskId: string,
  customActions?: GOAPAction[]
): GOAPPlan {
  const actions = customActions ?? DEFAULT_ACTIONS;
  const startState: GOAPState = {};
  const goalState = extractObjectiveConditions(objective);

  const plan = aStarSearch(startState, goalState, actions);

  if (plan) {
    return {
      actions: plan,
      totalCost: plan.reduce((sum, a) => sum + a.cost, 0),
      subtasks: actionsToSubtasks(plan, hiveTaskId, objective),
    };
  }

  // Fallback: descomposición lineal usando inferBotRole
  const baseParts = objective
    .split(/\n|;|\.(?=\s+[A-ZÁÉÍÓÚÑa-záéíóúñ])/g)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
  const parts = baseParts.length > 0 ? baseParts : [objective.trim()];

  const subtasks: Subtask[] = parts.map((description, index) => {
    const role = inferBotRoleSimple(description);
    return {
      id: `${hiveTaskId}-subtask-${index + 1}`,
      taskId: hiveTaskId,
      parentTaskId: hiveTaskId,
      description,
      assignedBotRole: role,
      status: 'pending',
      dependencies: index === 0 ? [] : [`${hiveTaskId}-subtask-${index}`],
      createdAt: new Date(),
    };
  });

  return {
    actions: [],
    totalCost: subtasks.length,
    subtasks,
  };
}

function inferBotRoleSimple(description: string): BotRole {
  const d = description.toLowerCase();
  if (d.includes('test') || d.includes('spec')) return 'tester';
  if (d.includes('deploy') || d.includes('release')) return 'deployer';
  if (d.includes('document') || d.includes('readme')) return 'doc-writer';
  if (d.includes('security') || d.includes('vulnerab')) return 'security';
  if (d.includes('research') || d.includes('investiga')) return 'researcher';
  return 'coder';
}
