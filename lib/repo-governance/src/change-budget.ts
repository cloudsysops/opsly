import type { ChangeBudgetLimits, ChangeBudgetReport, FileChange } from './types.js';

function appsFromPaths(paths: string[]): string[] {
  const apps = new Set<string>();
  for (const p of paths) {
    if (p.startsWith('apps/')) {
      const app = p.split('/')[1];
      if (app) {
        apps.add(app);
      }
    }
  }
  return [...apps].sort();
}

export function evaluateChangeBudget(
  changes: FileChange[],
  limits: ChangeBudgetLimits,
): ChangeBudgetReport {
  const paths = changes.map((c) => c.path);
  const newFiles = changes.filter((c) => c.status === 'added').length;
  const deletedFiles = changes.filter((c) => c.status === 'deleted').length;
  const linesChanged = changes.reduce((sum, c) => sum + c.additions + c.deletions, 0);
  const appsTouched = appsFromPaths(paths);
  const violations: string[] = [];

  if (changes.length > limits.max_files_changed) {
    violations.push(
      `files_changed ${changes.length} > max ${limits.max_files_changed}`,
    );
  }
  if (linesChanged > limits.max_lines_changed) {
    violations.push(
      `lines_changed ${linesChanged} > max ${limits.max_lines_changed}`,
    );
  }
  if (newFiles > limits.max_new_files) {
    violations.push(`new_files ${newFiles} > max ${limits.max_new_files}`);
  }
  if (deletedFiles > limits.max_deleted_files) {
    violations.push(
      `deleted_files ${deletedFiles} > max ${limits.max_deleted_files}`,
    );
  }
  if (appsTouched.length > limits.max_apps_touched) {
    violations.push(
      `apps_touched ${appsTouched.join(',')} count ${appsTouched.length} > max ${limits.max_apps_touched}`,
    );
  }

  return {
    within_budget: violations.length === 0,
    files_changed: changes.length,
    lines_changed: linesChanged,
    new_files: newFiles,
    deleted_files: deletedFiles,
    apps_touched: appsTouched,
    violations,
  };
}
