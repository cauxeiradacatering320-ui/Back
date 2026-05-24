import { query } from '../lib/db';

export interface AcessoRow {
  id: string;
  usuario_id: string;
  modulo_id: string;
  compra_id: string | null;
  status: 'ativo' | 'expirado' | 'cancelado' | 'bloqueado';
  iniciado_em: string;
  expira_em: string | null;
  criado_em: string;
  origem_acesso: string;
}

export interface AcessoComModulo extends AcessoRow {
  modulo_titulo: string;
  modulo_duracao_acesso_dias: number | null;
}

export interface CreateAcessoData {
  modulo_id: string;
  expira_em: string | null;
}

export interface UpdateAcessoData {
  expira_em: string | null;
  status?: 'ativo' | 'expirado' | 'cancelado' | 'bloqueado';
}

export class AcessoService {
  static async findByUsuario(usuarioId: string): Promise<AcessoComModulo[]> {
    const result = await query(
      `SELECT a.*, m.titulo AS modulo_titulo, m.duracao_acesso_dias AS modulo_duracao_acesso_dias
       FROM acessos_modulo a
       JOIN modulos m ON m.id = a.modulo_id
       WHERE a.usuario_id = $1
       ORDER BY a.criado_em DESC`,
      [usuarioId]
    );
    return result.rows as AcessoComModulo[];
  }

  static async findModulosDisponiveis(usuarioId: string) {
    const result = await query(
      `SELECT m.* FROM modulos m
       WHERE m.deletado_em IS NULL
         AND m.id NOT IN (
           SELECT a.modulo_id FROM acessos_modulo a WHERE a.usuario_id = $1
         )
       ORDER BY m.titulo ASC`,
      [usuarioId]
    );
    return result.rows;
  }

  static async create(usuarioId: string, data: CreateAcessoData): Promise<AcessoComModulo> {
    const exists = await query(
      'SELECT id FROM acessos_modulo WHERE usuario_id = $1 AND modulo_id = $2',
      [usuarioId, data.modulo_id]
    );
    if (exists.rows.length > 0) {
      throw new Error('Usuário já possui acesso a este módulo');
    }

    const mod = await query(
      'SELECT duracao_acesso_dias FROM modulos WHERE id = $1',
      [data.modulo_id]
    );
    if (mod.rows.length === 0) {
      throw new Error('Módulo não encontrado');
    }

    let expiraEm = data.expira_em;
    if (!expiraEm && mod.rows[0].duracao_acesso_dias) {
      const d = new Date();
      d.setDate(d.getDate() + mod.rows[0].duracao_acesso_dias);
      expiraEm = d.toISOString();
    }

    const result = await query(
      `INSERT INTO acessos_modulo (usuario_id, modulo_id, expira_em, origem_acesso)
       VALUES ($1, $2, $3, 'gratuito')
       RETURNING *`,
      [usuarioId, data.modulo_id, expiraEm]
    );

    const acesso = result.rows[0] as AcessoRow;
    return {
      ...acesso,
      modulo_titulo: '',
      modulo_duracao_acesso_dias: mod.rows[0].duracao_acesso_dias,
    };
  }

  static async update(id: string, data: UpdateAcessoData): Promise<AcessoRow | null> {
    const sets: string[] = [];
    const params: any[] = [];
    let idx = 1;

    if (data.expira_em !== undefined) {
      sets.push(`expira_em = $${idx++}`);
      params.push(data.expira_em);
    }
    if (data.status) {
      sets.push(`status = $${idx++}`);
      params.push(data.status);
    }

    if (sets.length === 0) return null;

    params.push(id);
    const result = await query(
      `UPDATE acessos_modulo SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
      params
    );
    return (result.rows[0] as AcessoRow) || null;
  }

  static async delete(id: string): Promise<boolean> {
    const result = await query('DELETE FROM acessos_modulo WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }
}
