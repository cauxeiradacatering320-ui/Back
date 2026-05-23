import { query } from '../lib/db';
import { hashPassword, comparePassword } from '../utils/hash';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt';
import type { UserData } from '../types';
import crypto from 'crypto';

interface DbUser {
  id: string;
  nome: string;
  email: string;
  senha_hash: string;
  role: 'admin' | 'produtor' | 'aluno';
}

export class AuthService {
  static async register(nome: string, email: string, senha_plana: string) {
    const resCheck = await query('SELECT id FROM usuarios WHERE email = $1', [email]);
    if (resCheck.rows.length > 0) {
      throw new Error('Email já está em uso');
    }

    const senha_hash = await hashPassword(senha_plana);

    const resInsert = await query(
      'INSERT INTO usuarios (nome, email, senha_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, nome, email, role',
      [nome, email, senha_hash, 'aluno']
    );

    return resInsert.rows[0] as UserData;
  }

  static async login(email: string, senha_plana: string, ip: string, userAgent: string) {
    const resUser = await query('SELECT * FROM usuarios WHERE email = $1', [email]);
    if (resUser.rows.length === 0) {
      throw new Error('Credenciais inválidas');
    }

    const user = resUser.rows[0] as DbUser;

    const isMatch = await comparePassword(senha_plana, user.senha_hash);
    if (!isMatch) {
      throw new Error('Credenciais inválidas');
    }

    return this.createSession(user, ip, userAgent);
  }

  static async createSession(user: DbUser, ip: string, userAgent: string) {
    const accessToken = generateAccessToken({ id: user.id, role: user.role });
    const refreshToken = generateRefreshToken({ id: user.id, role: user.role });

    const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    const expiradoEm = new Date();
    expiradoEm.setDate(expiradoEm.getDate() + 30);

    // Revoga todas as sessões ativas anteriores (apenas 1 sessão por usuário)
    await query(
      `UPDATE sessoes SET revogado_em = CURRENT_TIMESTAMP
       WHERE usuario_id = $1 AND revogado_em IS NULL`,
      [user.id]
    );

    await query(
      `INSERT INTO sessoes (usuario_id, refresh_token_hash, ip_address, user_agent, expirado_em)
       VALUES ($1, $2, $3, $4, $5)`,
      [user.id, refreshTokenHash, ip, userAgent, expiradoEm]
    );

    // Limpa sessões revogadas ou expiradas com mais de 30 dias
    await query(
      `DELETE FROM sessoes
       WHERE usuario_id = $1
         AND (revogado_em IS NOT NULL OR expirado_em <= NOW())
         AND criado_em < NOW() - INTERVAL '30 days'`,
      [user.id]
    );

    return {
      user: { id: user.id, nome: user.nome, email: user.email, role: user.role },
      accessToken,
      refreshToken
    };
  }

  static async refreshSession(refreshToken: string, ip: string, userAgent: string) {
    const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    const resSession = await query(
      'SELECT s.*, u.id as u_id, u.nome, u.email, u.role FROM sessoes s JOIN usuarios u ON s.usuario_id = u.id WHERE s.refresh_token_hash = $1',
      [refreshTokenHash]
    );

    if (resSession.rows.length === 0) {
      throw new Error('Sessão inválida ou não encontrada');
    }

    const session = resSession.rows[0];

    if (session.revogado_em) {
      throw new Error('Sessão revogada');
    }

    if (new Date() > new Date(session.expirado_em)) {
      throw new Error('Refresh token expirado');
    }

    await query('UPDATE sessoes SET revogado_em = CURRENT_TIMESTAMP WHERE id = $1', [session.id]);

    const user: DbUser = {
      id: session.u_id,
      nome: session.nome,
      email: session.email,
      role: session.role,
      senha_hash: '',
    };
    return this.createSession(user, ip, userAgent);
  }

  static async verifySession(refreshToken: string) {
    if (!refreshToken) {
      return null;
    }

    const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    const resSession = await query(
      `SELECT u.id, u.nome, u.email, u.role
       FROM sessoes s
       JOIN usuarios u ON s.usuario_id = u.id
       WHERE s.refresh_token_hash = $1
         AND s.revogado_em IS NULL
         AND s.expirado_em > NOW()`,
      [refreshTokenHash]
    );

    if (resSession.rows.length === 0) {
      return null;
    }

    return resSession.rows[0] as UserData;
  }

  static async logout(refreshToken: string) {
    if (!refreshToken) return;
    
    const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    await query('UPDATE sessoes SET revogado_em = CURRENT_TIMESTAMP WHERE refresh_token_hash = $1', [refreshTokenHash]);
  }
}
