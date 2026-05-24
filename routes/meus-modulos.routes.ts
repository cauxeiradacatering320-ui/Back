import { FastifyInstance } from 'fastify';
import { authenticate } from '../middlewares/auth';
import { listMeusModulos, listRecomendados } from '../controllers/meus-modulos.controller';

export async function meusModulosRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);

  app.get('/', listMeusModulos);
  app.get('/recomendados', listRecomendados);
}
