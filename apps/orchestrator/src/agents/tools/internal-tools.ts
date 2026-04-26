import type { ToolManifest } from './types.js';

export class GetServerStatusTool implements ToolManifest {
  readonly name = 'get_server_status';
  readonly description = 'Estado básico del servidor (mock).';
  readonly capabilities = ['ops_status', 'health_check'];
  readonly riskLevel = 'low' as const;

  async execute(): Promise<unknown> {
    return {
      ok: true,
      mocked: true,
      status: 'healthy',
      ts: new Date().toISOString(),
    };
  }
}

export class RestartContainerTool implements ToolManifest {
  readonly name = 'restart_container';
  readonly description = 'Reinicio de contenedor (mock seguro, sin efecto real).';
  readonly capabilities = ['ops_recovery', 'container_management'];
  readonly riskLevel = 'high' as const;

  async execute(input: unknown): Promise<unknown> {
    const payload =
      typeof input === 'object' && input !== null ? (input as Record<string, unknown>) : {};
    return {
      ok: true,
      mocked: true,
      container: payload.container ?? null,
      message: 'restart simulated',
    };
  }
}
