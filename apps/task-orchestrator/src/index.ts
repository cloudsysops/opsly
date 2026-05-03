import { startServer } from './server';
import { notifyOrchestratorReady } from './notify-orchestrator-ready';
import { taskQueue } from './services/queue';

async function main() {
  try {
    const server = await startServer();
    const port = Number(process.env.PORT || 3015);
    notifyOrchestratorReady(port);

    // Graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\n⏹️ Shutting down gracefully...');
      await taskQueue.disconnect();
      server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
      });
    });

    process.on('SIGTERM', async () => {
      console.log('\n⏹️ Shutting down (SIGTERM)...');
      await taskQueue.disconnect();
      server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
      });
    });
  } catch (error) {
    console.error('❌ Failed to start:', error);
    process.exit(1);
  }
}

main();
