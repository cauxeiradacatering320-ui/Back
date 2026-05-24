import { FastifyInstance } from 'fastify';
import { authenticate, requireAdmin } from '../middlewares/auth';
import { criarCompraManual } from '../controllers/compra-manual.controller';

export async function adminCompraManualRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);
  app.addHook('preHandler', requireAdmin);

  app.post('/:usuarioId/compras/manual', criarCompraManual);
}
