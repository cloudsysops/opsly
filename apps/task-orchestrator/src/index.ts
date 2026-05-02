import { startServer } from './server';

startServer()
  .then(() => {
    console.log('🚀 Task Orchestrator started successfully');
  })
  .catch(error => {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  });

process.on('SIGINT', () => {
  console.log('\n👋 Shutting down gracefully...');
  process.exit(0);
});
