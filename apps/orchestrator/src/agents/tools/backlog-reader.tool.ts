import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ToolManifest } from './types.js';

interface Task {
  title: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'pending' | 'in-progress' | 'blocked' | 'done';
  scope?: string; // api, ui, devops, infra
  description?: string;
}

interface BacklogResult {
  ok: boolean;
  tasks: Task[];
  total_tasks: number;
  error?: string;
}

function extractTasks(content: string, source: string): Task[] {
  const tasks: Task[] = [];

  // Simple markdown parsing: look for `- [ ]` or `- [x]` patterns
  const lines = content.split('\n');
  let currentSection = '';

  for (const line of lines) {
    // Detect section headers (## or ###)
    const headerMatch = line.match(/^#+\s+(.+)/);
    if (headerMatch) {
      currentSection = headerMatch[1].toLowerCase();
    }

    // Detect task checkboxes: - [ ] or - [x]
    const taskMatch = line.match(/^\s*-\s+\[([xX ])\]\s+(.+)/);
    if (taskMatch) {
      const [, checked, title] = taskMatch;
      const status = checked === 'x' || checked === 'X' ? 'done' : 'pending';

      // Try to infer priority from keywords
      let priority: Task['priority'] = 'medium';
      if (
        title.includes('CRITICAL') ||
        title.includes('critical') ||
        title.includes('urgent')
      ) {
        priority = 'critical';
      } else if (
        title.includes('HIGH') ||
        title.includes('High') ||
        title.includes('important')
      ) {
        priority = 'high';
      } else if (title.includes('LOW') || title.includes('Low')) {
        priority = 'low';
      }

      // Try to infer scope
      let scope: Task['scope'];
      if (title.includes('api') || title.includes('API')) {
        scope = 'api';
      } else if (
        title.includes('UI') ||
        title.includes('ui') ||
        title.includes('portal') ||
        title.includes('admin')
      ) {
        scope = 'ui';
      } else if (
        title.includes('infra') ||
        title.includes('deploy') ||
        title.includes('VPS') ||
        title.includes('docker')
      ) {
        scope = 'devops';
      }

      tasks.push({
        title: title.trim(),
        priority,
        status,
        scope,
      });
    }
  }

  return tasks;
}

export const BacklogReaderTool: ToolManifest = {
  name: 'backlog_reader',
  description: 'Lee AGENTS.md y ROADMAP.md para extraer tareas pendientes, prioridades y scope',
  capabilities: ['backlog', 'planning', 'task-management'],
  riskLevel: 'low',
  async execute(input: unknown): Promise<BacklogResult> {
    const tasks: Task[] = [];

    try {
      const rootDir = process.cwd();

      // Try to read AGENTS.md
      try {
        const agentsPath = join(rootDir, 'AGENTS.md');
        const agentsContent = readFileSync(agentsPath, 'utf-8');
        const agentsTasks = extractTasks(agentsContent, 'AGENTS.md');
        tasks.push(...agentsTasks);
      } catch {
        // AGENTS.md might not exist or be unreadable
      }

      // Try to read ROADMAP.md
      try {
        const roadmapPath = join(rootDir, 'ROADMAP.md');
        const roadmapContent = readFileSync(roadmapPath, 'utf-8');
        const roadmapTasks = extractTasks(roadmapContent, 'ROADMAP.md');
        tasks.push(...roadmapTasks);
      } catch {
        // ROADMAP.md might not exist or be unreadable
      }

      if (tasks.length === 0) {
        return {
          ok: false,
          tasks: [],
          total_tasks: 0,
          error: 'No tasks found in AGENTS.md or ROADMAP.md',
        };
      }

      // Sort by priority (critical > high > medium > low) and status (pending first)
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      const statusOrder = { pending: 0, 'in-progress': 1, blocked: 2, done: 3 };

      tasks.sort((a, b) => {
        const priorityDiff =
          priorityOrder[a.priority as keyof typeof priorityOrder] -
          priorityOrder[b.priority as keyof typeof priorityOrder];
        if (priorityDiff !== 0) return priorityDiff;

        const statusDiff =
          statusOrder[a.status as keyof typeof statusOrder] -
          statusOrder[b.status as keyof typeof statusOrder];
        return statusDiff;
      });

      return {
        ok: true,
        tasks,
        total_tasks: tasks.length,
      };
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e);
      return {
        ok: false,
        tasks: [],
        total_tasks: 0,
        error,
      };
    }
  },
};
