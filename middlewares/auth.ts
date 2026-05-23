import { FastifyRequest, FastifyReply } from 'fastify';
import { verifyAccessToken } from '../utils/jwt';
import type { UserPayload } from '../types';

declare module 'fastify' {
  interface FastifyRequest {
    user?: UserPayload;
  }
}

export const authenticate = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const authHeader = request.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.status(401).send({ error: 'Token não fornecido ou inválido' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token);
    
    request.user = decoded;
  } catch (error) {
    return reply.status(401).send({ error: 'Token expirado ou inválido' });
  }
};

export const requireAdmin = async (request: FastifyRequest, reply: FastifyReply) => {
  if (!request.user || request.user.role !== 'admin') {
    return reply.status(403).send({ error: 'Acesso negado. Requer privilégios de administrador.' });
  }
};
