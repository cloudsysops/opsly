import { startServer } from './server';
import { taskQueue } from './services/queue';

async function main() {
  try {
    // Initialize task queue
    await taskQueue.connect();
    console.log('✅ Redis connected');

    // Start Express server
    const server = await startServer();

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
