import { FastifyInstance } from 'fastify';
import { authenticate, requireAdmin } from '../middlewares/auth';
import { listarPagamentos } from '../controllers/pagamento.controller';

export async function adminPagamentoRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);
  app.addHook('preHandler', requireAdmin);

  app.get('/', listarPagamentos);
}
