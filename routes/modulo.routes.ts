import { FastifyInstance } from 'fastify';
import { authenticate, requireAdmin } from '../middlewares/auth';
import {
  createModulo,
  updateModulo,
  listModulos,
  listPublicModulos,
  getModulo,
  getPublicModulo,
  uploadThumbnail,
} from '../controllers/modulo.controller';

export async function adminModuloRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);
  app.addHook('preHandler', requireAdmin);

  app.post('/', createModulo);
  app.put('/:id', updateModulo);
  app.get('/', listModulos);
  app.get('/:id', getModulo);
  app.post('/:id/thumbnail', uploadThumbnail);
}

export async function publicModuloRoutes(app: FastifyInstance) {
  app.get('/', listPublicModulos);
  app.get('/:id', getPublicModulo);
}
