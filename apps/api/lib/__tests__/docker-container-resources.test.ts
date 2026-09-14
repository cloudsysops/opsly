import { describe, expect, it } from 'vitest';
import { mapDockerStatsJsonLine } from '../docker-container-resources';

describe('docker container resource parsing', () => {
  it('parses docker stats json without fabricating values', () => {
    const row = mapDockerStatsJsonLine(
      JSON.stringify({
        ID: 'abc123',
        Name: 'opsly_orchestrator',
        CPUPerc: '12.50%',
        MemUsage: '245MiB / 1GiB',
        MemPerc: '23.93%',
        NetIO: '12MB / 8MB',
        BlockIO: '1MB / 2MB',
        PIDs: '18',
      }),
    );
    expect(row).toEqual({
      id: 'abc123',
      name: 'opsly_orchestrator',
      cpu_percent: 12.5,
      memory_usage: '245MiB / 1GiB',
      memory_percent: 23.93,
      net_io: '12MB / 8MB',
      block_io: '1MB / 2MB',
      pids: 18,
    });
  });

  it('keeps unavailable percentages unknown', () => {
    const row = mapDockerStatsJsonLine(JSON.stringify({ ID: 'x', Name: 'redis' }));
    expect(row?.cpu_percent).toBeNull();
    expect(row?.memory_percent).toBeNull();
  });
});
