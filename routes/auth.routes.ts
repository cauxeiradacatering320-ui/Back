import { FastifyInstance } from 'fastify';
import { register, login, refresh, verifySession, logout, changePassword, updateProfile } from '../controllers/auth.controller';
import { authenticate, requireAdmin } from '../middlewares/auth';

export async function authRoutes(app: FastifyInstance) {
  // Rotas públicas
  app.post('/register', {
    schema: {
      body: {
        type: 'object',
        required: ['nome', 'email', 'senha'],
        properties: {
          nome: { type: 'string' },
          email: { type: 'string', format: 'email' },
          senha: { type: 'string', minLength: 6 }
        }
      }
    }
  }, register);

  app.post('/login', {
    schema: {
      body: {
        type: 'object',
        required: ['email', 'senha'],
        properties: {
          email: { type: 'string', format: 'email' },
          senha: { type: 'string' }
        }
      }
    }
  }, login);

  app.post('/refresh', refresh);
  app.get('/session/verify', verifySession);
  app.post('/logout', logout);

  app.post('/change-password', { preHandler: [authenticate] }, changePassword);
  app.put('/me', { preHandler: [authenticate] }, updateProfile);

  app.get('/me', { preHandler: [authenticate] }, async (request, reply) => {
    return reply.send({ user: request.user });
  });

  app.get('/admin-only', { preHandler: [authenticate, requireAdmin] }, async (request, reply) => {
    return reply.send({ message: 'Você é um admin!' });
  });
}
