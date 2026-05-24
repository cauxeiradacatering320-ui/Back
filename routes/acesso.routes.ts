import { FastifyInstance } from 'fastify';
import { authenticate, requireAdmin } from '../middlewares/auth';
import {
  listAcessos,
  listModulosDisponiveis,
  createAcesso,
  updateAcesso,
  deleteAcesso,
} from '../controllers/acesso.controller';

export async function adminAcessoRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);
  app.addHook('preHandler', requireAdmin);

  app.get('/:usuarioId/acessos', listAcessos);
  app.get('/:usuarioId/acessos/disponiveis', listModulosDisponiveis);
  app.post('/:usuarioId/acessos', createAcesso);
  app.put('/:usuarioId/acessos/:acessoId', updateAcesso);
  app.delete('/:usuarioId/acessos/:acessoId', deleteAcesso);
}
