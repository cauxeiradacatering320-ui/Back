import { FastifyRequest, FastifyReply } from 'fastify';
import { AuthService } from '../services/auth.service';
import { query } from '../lib/db';
import { verifyAccessToken } from '../utils/jwt';

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' as const : 'lax' as const,
  path: '/',
  maxAge: 30 * 24 * 60 * 60,
};

const ROLE_COOKIE_OPTIONS = {
  httpOnly: false,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' as const : 'lax' as const,
  path: '/',
  maxAge: 30 * 24 * 60 * 60,
};

export async function register(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { nome, email, senha, telefone } = request.body as any;
    const user = await AuthService.register(nome, email, senha, telefone);

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
    reply.clearCookie('refresh_token', { path: '/', sameSite: 'lax' });
    reply.clearCookie('user_role', { path: '/', sameSite: 'lax' });
    return reply.status(401).send({ error: error.message });
  }
}

export async function verifySession(request: FastifyRequest, reply: FastifyReply) {
  try {
    const refreshToken = request.cookies.refresh_token;

    if (refreshToken) {
      const user = await AuthService.verifySession(refreshToken);
      if (!user) {
        reply.clearCookie('refresh_token', { path: '/', sameSite: 'lax' });
        reply.clearCookie('user_role', { path: '/', sameSite: 'lax' });
        return reply.status(401).send({ valid: false, error: 'Sessão expirada ou revogada' });
      }
      return reply.send({ valid: true, user });
    }

    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = verifyAccessToken(token);
      const res = await query('SELECT id, nome, email, role FROM usuarios WHERE id = $1 AND deletado_em IS NULL', [decoded.id]);
      if (res.rows.length === 0) {
        return reply.status(401).send({ valid: false, error: 'Usuário não encontrado' });
      }
      return reply.send({ valid: true, user: res.rows[0] });
    }

    return reply.status(401).send({ valid: false, error: 'Sessão não encontrada' });
  } catch (error: any) {
    return reply.status(500).send({ error: error.message });
  }
}

export async function me(request: FastifyRequest, reply: FastifyReply) {
  try {
    const userId = request.user!.id;
    const res = await query('SELECT id, nome, email, role FROM usuarios WHERE id = $1 AND deletado_em IS NULL', [userId]);

    if (res.rows.length === 0) {
      return reply.status(404).send({ error: 'Usuário não encontrado' });
    }

    return reply.send({ user: res.rows[0] });
  } catch (error: any) {
    return reply.status(500).send({ error: error.message });
  }
}

export async function changePassword(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { senha_atual, nova_senha } = request.body as any;
    const userId = request.user!.id;

    if (!senha_atual || !nova_senha) {
      return reply.status(400).send({ error: 'Senha atual e nova senha são obrigatórias' });
    }

    if (nova_senha.length < 6) {
      return reply.status(400).send({ error: 'Nova senha deve ter no mínimo 6 caracteres' });
    }

    await AuthService.changePassword(userId, senha_atual, nova_senha);

    reply.clearCookie('refresh_token', { path: '/' });
    reply.clearCookie('user_role', { path: '/' });

    return reply.send({ message: 'Senha alterada com sucesso. Faça login novamente.' });
  } catch (error: any) {
    return reply.status(400).send({ error: error.message });
  }
}

export async function updateProfile(request: FastifyRequest, reply: FastifyReply) {
  try {
    const userId = request.user!.id;
    const { nome, email, telefone } = request.body as any;

    const updated = await AuthService.updateProfile(userId, { nome, email, telefone });
    if (!updated) {
      return reply.status(400).send({ error: 'Nenhum dado para atualizar' });
    }

    return reply.send({ user: updated });
  } catch (error: any) {
    return reply.status(400).send({ error: error.message });
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
