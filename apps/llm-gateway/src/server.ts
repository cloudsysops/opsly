import { closeRedisClient } from './cache.js';
import { healthDaemon } from './health-daemon.js';
import { createHealthServer } from './health-server.js';

async function main(): Promise<void> {
  await healthDaemon.start();
  console.log('[llm-gateway] Health daemon iniciado');

  createHealthServer();

  let shutdownStarted = false;
  const shutdown = (signal: string): void => {
    if (shutdownStarted) {
      return;
    }
    shutdownStarted = true;
    void (async () => {
      console.log(`[llm-gateway] Shutdown (${signal})...`);
      await Promise.allSettled([healthDaemon.stop(), closeRedisClient()]);
      process.exit(0);
    })().catch((e) => {
      console.error('[llm-gateway] shutdown failed', e);
      process.exit(1);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
