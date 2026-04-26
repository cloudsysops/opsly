import { vi } from 'vitest';

const hoisted = vi.hoisted(() => ({
  childProcessExecFileMock: vi.fn((...args: unknown[]) => {
    const cb = args[args.length - 1] as (
      e: Error | null,
      so?: string | Buffer,
      se?: string | Buffer
    ) => void;
    if (typeof cb === 'function') {
      cb(null, Buffer.from('apps/api/health/route.ts\n'), Buffer.from(''));
    }
  }),
}));

vi.mock('node:child_process', () => ({
  execFile: hoisted.childProcessExecFileMock,
}));
