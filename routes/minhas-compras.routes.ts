import { FastifyInstance } from 'fastify';
import { authenticate } from '../middlewares/auth';
import { listMinhasCompras } from '../controllers/minhas-compras.controller';

export async function minhasComprasRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);

  app.get('/', listMinhasCompras);
}
