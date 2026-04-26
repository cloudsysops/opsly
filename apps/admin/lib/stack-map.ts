import type { ContainerStatus, DockerContainerState } from './types';

export function stackRecordToContainers(
  stack: Record<string, DockerContainerState>
): ContainerStatus[] {
  return Object.entries(stack).map(([name, state]) => ({
    name,
    state,
    health: state === 'running' ? 'ok' : '—',
  }));
}
