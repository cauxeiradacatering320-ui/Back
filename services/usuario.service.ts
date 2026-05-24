import { query } from '../lib/db';
import { hashPassword } from '../utils/hash';

export interface UsuarioRow {
  id: string;
  nome: string;
  email: string;
  telefone: string | null;
  role: 'admin' | 'produtor' | 'aluno';
  foto_url: string | null;
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
  deletado_em: string | null;
}

export interface CreateUsuarioData {
  nome: string;
  email: string;
  senha: string;
  telefone?: string;
  role: 'admin' | 'produtor' | 'aluno';
}

export interface UpdateUsuarioData {
  nome: string;
  email: string;
  telefone: string | null;
  role: 'admin' | 'produtor' | 'aluno';
  ativo: boolean;
}

export class UsuarioService {
  static async findAll(): Promise<UsuarioRow[]> {
    const result = await query(
      'SELECT * FROM usuarios WHERE deletado_em IS NULL ORDER BY criado_em DESC'
    );
    return result.rows as UsuarioRow[];
  }

  static async findById(id: string): Promise<UsuarioRow | null> {
    const result = await query(
      'SELECT * FROM usuarios WHERE id = $1 AND deletado_em IS NULL',
      [id]
    );
    return (result.rows[0] as UsuarioRow) || null;
  }

  static async create(data: CreateUsuarioData): Promise<UsuarioRow> {
    const existing = await query('SELECT id FROM usuarios WHERE email = $1', [data.email]);
    if (existing.rows.length > 0) {
      throw new Error('Email já está em uso');
    }

    if (data.telefone) {
      const telExists = await query('SELECT id FROM usuarios WHERE telefone = $1', [data.telefone]);
      if (telExists.rows.length > 0) {
        throw new Error('Telefone já está em uso');
      }
    }

    const senha_hash = await hashPassword(data.senha);

    const result = await query(
      `INSERT INTO usuarios (nome, email, senha_hash, telefone, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [data.nome, data.email, senha_hash, data.telefone || null, data.role]
    );

    return result.rows[0] as UsuarioRow;
  }

  static async update(id: string, data: UpdateUsuarioData): Promise<UsuarioRow | null> {
    const emailExists = await query(
      'SELECT id FROM usuarios WHERE email = $1 AND id != $2',
      [data.email, id]
    );
    if (emailExists.rows.length > 0) {
      throw new Error('Email já está em uso');
    }

    if (data.telefone) {
      const telExists = await query(
        'SELECT id FROM usuarios WHERE telefone = $1 AND id != $2',
        [data.telefone, id]
      );
      if (telExists.rows.length > 0) {
        throw new Error('Telefone já está em uso');
      }
    }

    const result = await query(
      `UPDATE usuarios SET
        nome = $1, email = $2, telefone = $3,
        role = $4, ativo = $5, atualizado_em = NOW()
       WHERE id = $6 AND deletado_em IS NULL
       RETURNING *`,
      [data.nome, data.email, data.telefone, data.role, data.ativo, id]
    );

    return (result.rows[0] as UsuarioRow) || null;
  }

  static async toggleActive(id: string): Promise<UsuarioRow | null> {
    const result = await query(
      `UPDATE usuarios SET ativo = NOT ativo, atualizado_em = NOW()
       WHERE id = $1 AND deletado_em IS NULL
       RETURNING *`,
      [id]
    );
    return (result.rows[0] as UsuarioRow) || null;
  }

  static async softDelete(id: string): Promise<boolean> {
    const result = await query(
      `UPDATE usuarios SET deletado_em = NOW(), ativo = FALSE, atualizado_em = NOW()
       WHERE id = $1 AND deletado_em IS NULL`,
      [id]
    );
    return (result.rowCount ?? 0) > 0;
  }
}
