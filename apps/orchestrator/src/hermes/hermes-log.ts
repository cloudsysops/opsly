export function logHermesEvent(event: string, fields: Record<string, unknown>): void {
  process.stdout.write(`${JSON.stringify({ event, ts: new Date().toISOString(), ...fields })}\n`);
}
