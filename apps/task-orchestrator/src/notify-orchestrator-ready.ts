/**
 * Aviso opcional cuando el task-orchestrator queda arriba (Redis + HTTP).
 * Usa la misma variable que el resto de Opsly: DISCORD_WEBHOOK_URL.
 * Fire-and-forget: no tumba el proceso si Discord falla.
 */
export function notifyOrchestratorReady(port: number): void {
  const webhook = process.env.DISCORD_WEBHOOK_URL?.trim();
  if (!webhook) {
    return;
  }

  const healthHint = `curl -s http://127.0.0.1:${port}/api/health`;
  const payload = {
    embeds: [
      {
        title: 'Opsly — task-orchestrator activo',
        description: [
          'Cola BullMQ conectada y API lista.',
          `**Probar:** \`${healthHint}\``,
          'Opcional: `POST /api/tasks` con cuerpo validado por Zod.',
        ].join('\n'),
        color: 0x57f287,
      },
    ],
  };

  void fetch(webhook, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).catch(() => {
    /* evitar unhandledRejection */
  });
}
