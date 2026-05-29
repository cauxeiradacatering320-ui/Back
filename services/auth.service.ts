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
  static async register(nome: string, email: string, senha_plana: string, telefone?: string) {
    const resCheck = await query('SELECT id FROM usuarios WHERE email = $1', [email]);
    if (resCheck.rows.length > 0) throw new Error('Email já está em uso');

    const senha_hash = await hashPassword(senha_plana);
    const telefoneLimpo = telefone ? telefone.replace(/\D/g, '') : null;

    const resInsert = await query(
      'INSERT INTO usuarios (nome, email, senha_hash, role, telefone) VALUES ($1, $2, $3, $4, $5) RETURNING id, nome, email, role',
      [nome, email, senha_hash, 'aluno', telefoneLimpo]
    );

    return resInsert.rows[0] as UserData;
  }

  static async login(email: string, senha_plana: string, ip: string, userAgent: string) {
    const resUser = await query('SELECT * FROM usuarios WHERE email = $1', [email]);
    if (resUser.rows.length === 0) throw new Error('Credenciais inválidas');

    const user = resUser.rows[0] as DbUser;
    if (!(await comparePassword(senha_plana, user.senha_hash))) throw new Error('Credenciais inválidas');

    return this.createSession(user, ip, userAgent);
  }

  static async createSession(user: DbUser, ip: string, userAgent: string) {
    const accessToken = generateAccessToken({ id: user.id, role: user.role });
    const refreshToken = generateRefreshToken({ id: user.id, role: user.role });
    const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    const expiradoEm = new Date();
    expiradoEm.setDate(expiradoEm.getDate() + 30);

    await query('DELETE FROM sessoes WHERE usuario_id = $1', [user.id]);

    await query(
      `INSERT INTO sessoes (usuario_id, refresh_token_hash, ip_address, user_agent, expirado_em)
       VALUES ($1, $2, $3, $4, $5)`,
      [user.id, refreshTokenHash, ip, userAgent, expiradoEm]
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

    if (resSession.rows.length === 0) throw new Error('Sessão inválida ou não encontrada');

    const session = resSession.rows[0];
    if (session.revogado_em) throw new Error('Sessão revogada');
    if (new Date() > new Date(session.expirado_em)) throw new Error('Refresh token expirado');

    const newAccessToken = generateAccessToken({ id: session.u_id, role: session.role });

    await query(
      `UPDATE sessoes SET ip_address = $1, user_agent = $2, ultimo_uso_em = NOW()
       WHERE id = $3`,
      [ip, userAgent, session.id]
    );

    return {
      user: { id: session.u_id, nome: session.nome, email: session.email, role: session.role },
      accessToken: newAccessToken,
      refreshToken
    };
  }

  static async verifySession(refreshToken: string) {
    if (!refreshToken) return null;

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

    return (resSession.rows[0] as UserData) || null;
  }

  static async logout(refreshToken: string) {
    if (!refreshToken) return;

    const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    await query('UPDATE sessoes SET revogado_em = CURRENT_TIMESTAMP WHERE refresh_token_hash = $1', [refreshTokenHash]);
  }

  static async changePassword(userId: string, senhaAtual: string, novaSenha: string) {
    const res = await query('SELECT senha_hash FROM usuarios WHERE id = $1', [userId]);
    if (res.rows.length === 0) throw new Error('Usuário não encontrado');

    if (!(await comparePassword(senhaAtual, res.rows[0].senha_hash))) throw new Error('Senha atual incorreta');

    const novaSenhaHash = await hashPassword(novaSenha);
    await query('UPDATE usuarios SET senha_hash = $1, atualizado_em = NOW() WHERE id = $2', [novaSenhaHash, userId]);
    await query('UPDATE sessoes SET revogado_em = CURRENT_TIMESTAMP WHERE usuario_id = $1 AND revogado_em IS NULL', [userId]);
  }

  static async updateProfile(userId: string, data: { nome?: string; email?: string; telefone?: string | null }) {
    if (data.email) {
      const emailExists = await query('SELECT id FROM usuarios WHERE email = $1 AND id != $2', [data.email, userId]);
      if (emailExists.rows.length > 0) throw new Error('Email já está em uso');
    }

    if (data.telefone) {
      const telExists = await query('SELECT id FROM usuarios WHERE telefone = $1 AND id != $2', [data.telefone, userId]);
      if (telExists.rows.length > 0) throw new Error('Telefone já está em uso');
    }

    const sets: string[] = [];
    const params: any[] = [];
    let idx = 1;

    if (data.nome !== undefined) { sets.push(`nome = $${idx++}`); params.push(data.nome); }
    if (data.email !== undefined) { sets.push(`email = $${idx++}`); params.push(data.email); }
    if (data.telefone !== undefined) { sets.push(`telefone = $${idx++}`); params.push(data.telefone); }

    if (sets.length === 0) return null;

    sets.push(`atualizado_em = NOW()`);
    params.push(userId);

    const result = await query(
      `UPDATE usuarios SET ${sets.join(', ')} WHERE id = $${idx} AND deletado_em IS NULL RETURNING id, nome, email, telefone, role`,
      params
    );

    return (result.rows[0] as UserData & { telefone: string | null }) || null;
  }
}
