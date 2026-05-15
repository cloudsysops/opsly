import type { ToolDefinition, ToolContext } from '../types/index.js';

const SSH_KEY = process.env.OPSLY_AGENT_APPS_SSH_KEY || '~/.ssh/vps_to_opsly_admin';
const OPSLY_QUANTUM = process.env.OPSLY_AGENT_APPS_SSH_TARGET || 'dragon@100.89.38.3';
const DEFAULT_REPO_PATH =
  process.env.OPSLY_AGENT_APPS_REPO_PATH || '/Users/dragon/cboteros/proyectos/intcloudsysops';

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, "'\\''")}'`;
}

async function runSshCommand(command: string): Promise<string> {
  const { execFile } = await import('child_process');
  return new Promise((resolve, reject) => {
    execFile(
      'ssh',
      ['-o', 'StrictHostKeyChecking=no', '-o', 'ConnectTimeout=10', '-i', SSH_KEY, OPSLY_QUANTUM, command],
      { timeout: 30000 },
      (error, stdout, stderr) => {
        if (error) reject(error);
        else resolve(stdout || stderr);
      }
    );
  });
}

export const agentAppsTools: ToolDefinition<unknown, unknown>[] = [
  {
    name: 'agent_apps_list',
    description: 'Lista todas las aplicaciones disponibles en opsly-quantum por categoría',
    inputSchema: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          description:
            'Categoría de apps (opcional): editors, ai_agents, llm, containers, terminal, productivity, communication, music_production, streaming, design_creation, system',
        },
      },
    },
    handler: async (input: unknown, _context?: ToolContext) => {
      const { category } = (input as { category?: string }) || {};
      try {
        const result = await runSshCommand('ls /Applications/');
        const allApps = result.split('\n').filter(Boolean).sort();

        if (category) {
          return { apps: allApps.filter((a) => a.toLowerCase().includes(category.toLowerCase())) };
        }
        return { apps: allApps, categories: 'all' };
      } catch (error) {
        return { error: String(error) };
      }
    },
  },
  {
    name: 'agent_apps_open',
    description: 'Abre una aplicación específica en opsly-quantum',
    inputSchema: {
      type: 'object',
      properties: {
        app_name: { type: 'string', description: 'Nombre de la aplicación' },
      },
      required: ['app_name'],
    },
    handler: async (input: unknown, _context?: ToolContext) => {
      const { app_name } = input as { app_name: string };
      try {
        await runSshCommand(`open -a ${shellQuote(app_name)}`);
        return { success: true, message: `${app_name} abierto` };
      } catch (error) {
        return { error: String(error) };
      }
    },
  },
  {
    name: 'agent_system_status',
    description: 'Obtiene el estado del sistema en opsly-quantum',
    inputSchema: {
      type: 'object',
      properties: {
        check: {
          type: 'string',
          description: 'Qué verificar',
          enum: ['disk', 'memory', 'cpu', 'apps', 'network', 'all'],
        },
      },
      required: ['check'],
    },
    handler: async (input: unknown, _context?: ToolContext) => {
      const { check } = input as { check: string };
      try {
        let cmd = '';
        switch (check) {
          case 'disk':
            cmd = 'df -h | head -5';
            break;
          case 'memory':
            cmd = 'vm_stat';
            break;
          case 'cpu':
            cmd = 'top -l 1 -n 0 | head -10';
            break;
          case 'apps':
            cmd = 'ls /Applications/ | wc -l';
            break;
          case 'network':
            cmd = 'ifconfig | grep inet';
            break;
          default:
            cmd = 'df -h && echo "---" && vm_stat';
        }
        const result = await runSshCommand(cmd);
        return { status: check, output: result };
      } catch (error) {
        return { error: String(error) };
      }
    },
  },
  {
    name: 'agent_git',
    description: 'Ejecuta operaciones git de solo lectura en opsly-quantum',
    inputSchema: {
      type: 'object',
      properties: {
        operation: {
          type: 'string',
          description: 'Operación git',
          enum: ['status', 'diff', 'log', 'branch'],
        },
        repo_path: { type: 'string', description: 'Ruta al repositorio' },
      },
      required: ['operation'],
    },
    handler: async (input: unknown, _context?: ToolContext) => {
      const { operation, repo_path } = input as { operation: string; repo_path?: string };
      const path = repo_path || DEFAULT_REPO_PATH;
      try {
        let cmd = '';
        switch (operation) {
          case 'status':
            cmd = `cd ${shellQuote(path)} && git status --short --branch`;
            break;
          case 'log':
            cmd = `cd ${shellQuote(path)} && git log --oneline -10`;
            break;
          case 'branch':
            cmd = `cd ${shellQuote(path)} && git branch -a`;
            break;
          case 'diff':
            cmd = `cd ${shellQuote(path)} && git diff --stat`;
            break;
          default:
            throw new Error(`Unsupported read-only git operation: ${operation}`);
        }
        const result = await runSshCommand(cmd);
        return { operation, output: result };
      } catch (error) {
        return { error: String(error) };
      }
    },
  },
  {
    name: 'agent_manage_app',
    description: 'Gestiona aplicaciones: abre, cierra, reinicia',
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          description: 'Acción',
          enum: ['open', 'close', 'restart'],
        },
        app_name: { type: 'string', description: 'Nombre de la app' },
      },
      required: ['action', 'app_name'],
    },
    handler: async (input: unknown, _context?: ToolContext) => {
      const { action, app_name } = input as { action: string; app_name: string };
      try {
        let cmd = '';
        if (action === 'close') {
          cmd = `osascript -e ${shellQuote(`tell app "${app_name.replace(/"/g, '\\"')}" to quit`)}`;
        } else if (action === 'restart') {
          const script = shellQuote(`tell app "${app_name.replace(/"/g, '\\"')}" to quit`);
          cmd = `osascript -e ${script} && sleep 2 && open -a ${shellQuote(app_name)}`;
        } else {
          cmd = `open -a ${shellQuote(app_name)}`;
        }
        await runSshCommand(cmd);
        return { success: true, action, app: app_name };
      } catch (error) {
        return { error: String(error) };
      }
    },
  },
];
