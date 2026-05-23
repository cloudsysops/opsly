import { execSync } from 'child_process';
import { z } from 'zod';

const GitStatusLogSchema = z.object({
  command: z.enum(['status', 'log', 'diff', 'branch']).describe('Git command to run'),
  options: z.string().optional().describe('Additional git flags'),
  lines: z.number().int().positive().default(10).describe('Max lines for log/diff'),
});

type GitStatusLogInput = z.infer<typeof GitStatusLogSchema>;

export function gitStatusLogTool(input: GitStatusLogInput): {
  command: string;
  output: string | Array<{ file: string; status: string }>;
  lineCount?: number;
  error?: string;
} {
  const { command, options = '', lines } = GitStatusLogSchema.parse(input);

  try {
    let cmd: string;
    switch (command) {
      case 'status':
        cmd = `git status --porcelain`;
        break;
      case 'log':
        cmd = `git log --oneline -${lines} ${options}`;
        break;
      case 'diff':
        cmd = `git diff --stat -${lines} ${options}`;
        break;
      case 'branch':
        cmd = `git branch -v ${options}`;
        break;
      default:
        return { command, output: '', error: 'Unknown command' };
    }

    const output = execSync(cmd, { encoding: 'utf-8' });

    if (command === 'status') {
      const files = output
        .split('\n')
        .filter(Boolean)
        .map((line) => {
          const status = line.substring(0, 2).trim();
          const file = line.substring(3).trim();
          return { file, status };
        });
      return { command, output: files };
    }

    return { command, output, lineCount: output.split('\n').filter(Boolean).length };
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    return { command, output: '', error: errMsg };
  }
}
