import Fastify from 'fastify';
import { registerAcademyOnboardingRoutes } from './academy-onboarding-routes.js';

const fastify = Fastify({ logger: true });

fastify.get('/health', async () => ({
  status: 'OK',
  service: 'tenant-onboarding-agent',
  timestamp: new Date().toISOString(),
}));

registerAcademyOnboardingRoutes(fastify);

const port = Number(process.env.PORT ?? 3004);
fastify.listen({ port, host: '0.0.0.0' }, (err) => {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
});
