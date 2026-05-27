import { FastifyInstance } from 'fastify';
import { authenticate } from '../middlewares/auth';
import {
  listarCertificados,
  verificarCertificado,
  gerarCertificado,
} from '../controllers/certificado.controller';

export async function certificadoRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);

  app.get('/', listarCertificados);
  app.get('/:moduloId/verificar', verificarCertificado);
  app.post('/:moduloId/gerar', gerarCertificado);
}
