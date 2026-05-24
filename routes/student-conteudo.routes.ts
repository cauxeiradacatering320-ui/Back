import { FastifyInstance } from 'fastify';
import { authenticate } from '../middlewares/auth';
import { listConteudosComProgresso, marcarCompleto } from '../controllers/student-conteudo.controller';

export async function studentConteudoRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);

  app.get('/:moduloId/conteudos', listConteudosComProgresso);
  app.post('/:moduloId/conteudos/:conteudoId/progresso', marcarCompleto);
}
