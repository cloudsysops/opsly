import { execSync } from 'child_process';
import { z } from 'zod';

const RgCliSchema = z.object({
  pattern: z.string().describe('Search pattern (regex or literal)'),
  path: z.string().default('./').describe('Search path (default: current dir)'),
  flags: z.string().optional().describe('Additional ripgrep flags (-i, -w, --type, etc)'),
  maxResults: z.number().int().positive().default(50).describe('Max results to return'),
});

type RgCliInput = z.infer<typeof RgCliSchema>;

export function rgCliTool(input: RgCliInput): { matches: Array<{ file: string; line: number; lineContent: string; context?: string }>; total: number; error?: string } {
  const { pattern, path, flags = '', maxResults } = RgCliSchema.parse(input);

  try {
    const cmd = `rg --json ${flags} '${pattern.replace(/'/g, "'\\''")}' "${path}"`;
    const output = execSync(cmd, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });

    const matches: Array<{ file: string; line: number; lineContent: string; context?: string }> = [];
    const lines = output.split('\n').filter(Boolean);

    for (const line of lines) {
      if (matches.length >= maxResults) break;
      try {
        const json = JSON.parse(line);
        if (json.type === 'match' && json.data) {
          const { path: file, lines: lineData } = json.data;
          const lineNum = lineData[0]?.line_number || 0;
          const lineContent = lineData[0]?.text || '';
          matches.push({
            file,
            line: lineNum,
            lineContent: lineContent.trim(),
          });
        }
      } catch {
        // Skip malformed JSON lines
      }
    }

    return { matches, total: matches.length };
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    if (errMsg.includes('exit code 1')) {
      return { matches: [], total: 0 };
    }
    return { matches: [], total: 0, error: errMsg };
  }
}
