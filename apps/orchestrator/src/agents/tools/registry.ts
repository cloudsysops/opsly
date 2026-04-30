import { BacklogReaderTool } from './backlog-reader.tool.js';
import { DummySquareTool } from './dummy.tool.js';
import { GitTool } from './git.tool.js';
import { GetServerStatusTool, RestartContainerTool } from './internal-tools.js';
import { RunTestsTool } from './run-tests.tool.js';
import { ShellCommandTool } from './shell-command.tool.js';
import { TavilyTool } from './tavily-tool.js';
import { TypeCheckTool } from './type-check.tool.js';
import type { ToolManifest, ToolRegistry } from './types.js';

function normalized(text: string): string {
  return text.trim().toLowerCase();
}

export class InMemoryToolRegistry implements ToolRegistry {
  private readonly tools = new Map<string, ToolManifest>();

  register(tool: ToolManifest): void {
    this.tools.set(tool.name, tool);
  }

  has(name: string): boolean {
    return this.tools.has(name);
  }

  get(name: string): ToolManifest | undefined {
    return this.tools.get(name);
  }

  search(query: string): ToolManifest[] {
    const q = normalized(query);
    if (!q) {
      return [];
    }
    const words = q.split(/\s+/).filter((w) => w.length > 1);
    return [...this.tools.values()].filter((tool) => {
      const description = normalized(tool.description);
      const capabilities = tool.capabilities.map((c) => normalized(c));
      if (description.includes(q) || capabilities.some((c) => c.includes(q))) {
        return true;
      }
      return words.some(
        (w) => description.includes(w) || capabilities.some((capability) => capability.includes(w))
      );
    });
  }

  listToolNames(): string[] {
    return [...this.tools.keys()];
  }
}

function toolEnabledByEnv(toolName: string): boolean {
  if (toolName === 'tavily_search') {
    return Boolean(process.env.TAVILY_API_KEY?.trim());
  }
  return true;
}

export function createDefaultToolRegistry(): InMemoryToolRegistry {
  const registry = new InMemoryToolRegistry();
  const builtins: ToolManifest[] = [
    DummySquareTool,
    ShellCommandTool,
    new GetServerStatusTool(),
    new RestartContainerTool(),
    new TavilyTool(),
    RunTestsTool,
    TypeCheckTool,
    GitTool,
    BacklogReaderTool,
  ];
  for (const tool of builtins) {
    if (!toolEnabledByEnv(tool.name)) {
      continue;
    }
    registry.register(tool);
  }
  return registry;
}
