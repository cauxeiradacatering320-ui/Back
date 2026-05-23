import { FastifyRequest, FastifyReply } from 'fastify';
import { AuthService } from '../services/auth.service';

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 30 * 24 * 60 * 60,
};

const ROLE_COOKIE_OPTIONS = {
  httpOnly: false,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 30 * 24 * 60 * 60,
};

export async function register(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { nome, email, senha } = request.body as any;
    const user = await AuthService.register(nome, email, senha);

    const ip = request.ip;
    const userAgent = request.headers['user-agent'] || '';
    const { user: userData, accessToken, refreshToken } = await AuthService.login(email, senha, ip, userAgent);

    reply.setCookie('refresh_token', refreshToken, REFRESH_COOKIE_OPTIONS);
    reply.setCookie('user_role', user.role, ROLE_COOKIE_OPTIONS);

    return reply.status(201).send({ user: userData, accessToken });
  } catch (error: any) {
    return reply.status(400).send({ error: error.message });
  }
}

export async function login(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { email, senha } = request.body as any;
    const ip = request.ip;
    const userAgent = request.headers['user-agent'] || '';

    const { user, accessToken, refreshToken } = await AuthService.login(email, senha, ip, userAgent);

    reply.setCookie('refresh_token', refreshToken, REFRESH_COOKIE_OPTIONS);
    reply.setCookie('user_role', user.role, ROLE_COOKIE_OPTIONS);

    return reply.send({ user, accessToken });
  } catch (error: any) {
    return reply.status(401).send({ error: error.message });
  }
}

export async function refresh(request: FastifyRequest, reply: FastifyReply) {
  try {
    const refreshToken = request.cookies.refresh_token;

    if (!refreshToken) {
      return reply.status(401).send({ error: 'Refresh token não fornecido' });
    }

    const ip = request.ip;
    const userAgent = request.headers['user-agent'] || '';

    const { user, accessToken, refreshToken: newRefreshToken } = await AuthService.refreshSession(refreshToken, ip, userAgent);

    reply.setCookie('refresh_token', newRefreshToken, REFRESH_COOKIE_OPTIONS);
    reply.setCookie('user_role', user.role, ROLE_COOKIE_OPTIONS);

    return reply.send({ user, accessToken });
  } catch (error: any) {
    reply.clearCookie('refresh_token', { path: '/' });
    reply.clearCookie('user_role', { path: '/' });
    return reply.status(401).send({ error: error.message });
  }
}

export async function verifySession(request: FastifyRequest, reply: FastifyReply) {
  try {
    const refreshToken = request.cookies.refresh_token;

    if (!refreshToken) {
      return reply.status(401).send({ valid: false, error: 'Sessão não encontrada' });
    }

    const user = await AuthService.verifySession(refreshToken);

    if (!user) {
      reply.clearCookie('refresh_token', { path: '/' });
      reply.clearCookie('user_role', { path: '/' });
      return reply.status(401).send({ valid: false, error: 'Sessão expirada ou revogada' });
    }

    return reply.send({ valid: true, user });
  } catch (error: any) {
    return reply.status(500).send({ error: error.message });
  }
}

export async function logout(request: FastifyRequest, reply: FastifyReply) {
  try {
    const refreshToken = request.cookies.refresh_token;
    if (refreshToken) {
      await AuthService.logout(refreshToken);
    }

    reply.clearCookie('refresh_token', { path: '/' });
    reply.clearCookie('user_role', { path: '/' });
    return reply.send({ message: 'Logout realizado com sucesso' });
  } catch (error: any) {
    return reply.status(500).send({ error: 'Erro interno ao realizar logout' });
  }
}
