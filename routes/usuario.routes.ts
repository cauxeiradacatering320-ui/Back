import { FastifyInstance } from 'fastify';
import { authenticate, requireAdmin } from '../middlewares/auth';
import {
  listUsuarios,
  getUsuario,
  createUsuario,
  updateUsuario,
  toggleUsuarioActive,
  deleteUsuario,
} from '../controllers/usuario.controller';

export async function adminUsuarioRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);
  app.addHook('preHandler', requireAdmin);

  app.get('/', listUsuarios);
  app.get('/:id', getUsuario);
  app.post('/', createUsuario);
  app.put('/:id', updateUsuario);
  app.patch('/:id/toggle-active', toggleUsuarioActive);
  app.delete('/:id', deleteUsuario);
}
