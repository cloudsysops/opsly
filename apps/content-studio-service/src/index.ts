import 'dotenv/config';
import { startServer } from './server.js';

const PORT = parseInt(process.env.PORT ?? '3013', 10);

startServer(PORT).catch((err) => {
  console.error('[content-studio-service] Fatal startup error:', err);
  process.exit(1);
});
