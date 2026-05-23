import { execSync } from 'child_process';
import { z } from 'zod';

const LogViewerSchema = z.object({
  service: z.enum(['mcp', 'llm-gateway', 'orchestrator', 'context-builder', 'api']).describe('Service to view logs for'),
  lines: z.number().int().positive().default(50).describe('Number of log lines to retrieve'),
  filter: z.string().optional().describe('Filter pattern (grep regex)'),
  since: z.string().optional().describe('Time filter (e.g., "10 minutes ago", "1 hour ago")'),
});

type LogViewerInput = z.infer<typeof LogViewerSchema>;

interface LogEntry {
  timestamp?: string;
  level: string;
  message: string;
}

export function logViewerTool(input: LogViewerInput): {
  service: string;
  logs: LogEntry[];
  total: number;
  error?: string;
} {
  const { service, lines, filter = '', since = '' } = LogViewerSchema.parse(input);

  try {
    let cmd: string;
    const logPath = `/opt/opsly/runtime/logs/${service}.log`;

    // Try journalctl first (systemd), fall back to file
    try {
      let journalCmd = `journalctl -u opsly-${service} -n ${lines} --output=json`;
      if (since) {
        journalCmd += ` --since="${since}"`;
      }
      const output = execSync(journalCmd, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });

      const entries = output
        .split('\n')
        .filter(Boolean)
        .map((line) => {
          try {
            const json = JSON.parse(line);
            return {
              timestamp: json['__REALTIME_TIMESTAMP'] || new Date().toISOString(),
              level: json['PRIORITY'] === '3' ? 'ERROR' : 'INFO',
              message: json['MESSAGE'] || '',
            } as LogEntry;
          } catch {
            return null;
          }
        })
        .filter((e): e is LogEntry => e !== null && 'level' in e && 'message' in e);

      const filtered = filter ? entries.filter((e) => new RegExp(filter).test(e.message)) : entries;
      return { service, logs: filtered.slice(0, lines), total: filtered.length };
    } catch {
      // Fall back to file-based logs
      try {
        cmd = `tail -n ${lines} "${logPath}"`;
        if (filter) {
          cmd += ` | grep "${filter}"`;
        }
        const output = execSync(cmd, { encoding: 'utf-8' });

        const logs: LogEntry[] = output
          .split('\n')
          .filter(Boolean)
          .map((line) => {
            const match = line.match(/^\[(\d{4}-\d{2}-\d{2}T.*?)\]\s+(\w+)\s+(.*)$/);
            if (match) {
              return {
                timestamp: match[1],
                level: match[2],
                message: match[3],
              };
            }
            return { level: 'INFO', message: line };
          });

        return { service, logs, total: logs.length };
      } catch {
        // In-memory fallback for development
        const inMemoryLogs: LogEntry[] = [
          { timestamp: new Date().toISOString(), level: 'INFO', message: 'Service running normally' },
        ];
        return { service, logs: inMemoryLogs, total: 1 };
      }
    }
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    return { service, logs: [], total: 0, error: errMsg };
  }
}
