import { FastifyInstance } from 'fastify';
import { authenticate, requireAdmin } from '../middlewares/auth';
import {
  createVideoConteudo,
  createTextConteudo,
  listConteudos,
  getConteudo,
  syncConteudoStatus,
  updateConteudo,
  reorderConteudos,
  deleteConteudo,
} from '../controllers/conteudo.controller';

export async function adminConteudoRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);
  app.addHook('preHandler', requireAdmin);

  app.get('/:moduloId/conteudos', listConteudos);
  app.post('/:moduloId/conteudos/video', createVideoConteudo);
  app.post('/:moduloId/conteudos/texto', createTextConteudo);
  app.put('/:moduloId/conteudos/reorder', reorderConteudos);
  app.get('/:moduloId/conteudos/:id', getConteudo);
  app.post('/:moduloId/conteudos/:id/sync', syncConteudoStatus);
  app.patch('/:moduloId/conteudos/:id', updateConteudo);
  app.delete('/:moduloId/conteudos/:id', deleteConteudo);
}
