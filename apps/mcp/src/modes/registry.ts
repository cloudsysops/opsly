import type { ModeConfig } from './mode.types.js';

export const MODES_REGISTRY: Record<string, ModeConfig> = {
  developer: {
    id: 'developer',
    name: 'Developer',
    allowedTools: ['*'],
    blockedTools: [],
  },
  security: {
    id: 'security',
    name: 'Security',
    allowedTools: ['*'],
    blockedTools: ['fs_write_file', 'execute_terminal'],
  },
  mentor: {
    id: 'mentor',
    name: 'Mentor',
    allowedTools: [
      'fs_read_file',
      'get_tenants',
      'get_tenant',
      'get_health',
      'get_metrics',
      'list_context_resources',
      'read_context_resource',
      'list_adrs',
      'read_adr',
      'get_job_status',
    ],
    blockedTools: ['*'],
  },
};
