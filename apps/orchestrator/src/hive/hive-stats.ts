import type { Bot, HiveState, Subtask } from './types.js';

export interface HiveStats {
  activeBots: number;
  pendingTasks: number;
  completedTasks: number;
  totalSubtasks: number;
  completedSubtasks: number;
  failedSubtasks: number;
  retryingSubtasks: number;
  retryAttempts: number;
  manualRetryAttempts: number;
}

function subtaskResultNumber(subtask: Subtask, field: string): number {
  if (typeof subtask.result !== 'object' || subtask.result === null) return 0;
  const value = (subtask.result as Record<string, unknown>)[field];
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

export function computeHiveStats(state: HiveState): HiveStats {
  const allSubtasks = state.tasks.flatMap((task) => task.subtasks);
  const completedSubtasks = allSubtasks.filter((subtask) => subtask.status === 'completed').length;
  const failedSubtasks = allSubtasks.filter((subtask) => subtask.status === 'failed').length;
  const retryAttempts = allSubtasks.reduce((sum, subtask) => sum + subtaskResultNumber(subtask, 'retryCount'), 0);
  const manualRetryAttempts = allSubtasks.reduce(
    (sum, subtask) => sum + subtaskResultNumber(subtask, 'manualRetryCount'),
    0
  );
  const retryingSubtasks = allSubtasks.filter(
    (subtask) => ['pending', 'assigned'].includes(subtask.status) && subtaskResultNumber(subtask, 'retryCount') > 0
  ).length;

  return {
    activeBots: Object.values(state.bots).filter((bot: Bot) => bot.status === 'working').length,
    pendingTasks: state.tasks.filter((task) => task.status === 'planned').length,
    completedTasks: state.tasks.filter((task) => task.status === 'completed').length,
    totalSubtasks: allSubtasks.length,
    completedSubtasks,
    failedSubtasks,
    retryingSubtasks,
    retryAttempts,
    manualRetryAttempts,
  };
}
