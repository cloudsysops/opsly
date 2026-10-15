/**
 * Mutations of one session are serialised per session id. A read-modify-write of the session file
 * (resume, approval, checkpoint, send, stop) that overlaps another can otherwise save stale state:
 * for example a checkpoint that loaded `waiting_approval` before an approval delivered the held
 * command would write `waiting_approval` back afterwards, and a second approval would run the
 * deploy/push/delete again. Inside the lock each caller re-reads the current state.
 *
 * This covers one process; it is not a cross-host lock.
 */
const sessionLocks = new Map<string, Promise<unknown>>();

export async function withSessionLock<T>(sessionId: string, fn: () => Promise<T>): Promise<T> {
  const previous = sessionLocks.get(sessionId) ?? Promise.resolve();
  const run = previous.then(fn, fn);
  const tail = run.catch(() => undefined);
  sessionLocks.set(sessionId, tail);
  try {
    return await run;
  } finally {
    if (sessionLocks.get(sessionId) === tail) {
      sessionLocks.delete(sessionId);
    }
  }
}
