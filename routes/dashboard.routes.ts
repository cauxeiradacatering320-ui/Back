import { FastifyInstance } from 'fastify';
import { authenticate, requireAdmin } from '../middlewares/auth';
import { getDashboardData } from '../controllers/dashboard.controller';

export async function adminDashboardRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);
  app.addHook('preHandler', requireAdmin);

  app.get('/', getDashboardData);
}
