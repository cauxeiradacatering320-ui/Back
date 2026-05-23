import { FastifyInstance } from 'fastify';
import { handleBunnyWebhook } from '../controllers/bunny-webhook.controller';

export async function webhookRoutes(app: FastifyInstance) {
  app.post('/bunny', handleBunnyWebhook);
}
