import { query } from '../lib/db';
import { generateSlug } from '../utils/slug';
import { uploadImage } from '../lib/storage';

export interface CreateModuloData {
  titulo: string;
  descricao?: string;
  preco_centavos: number;
  gratuito: boolean;
  duracao_acesso_dias?: number;
  carga_horaria?: number;
  status: 'rascunho' | 'publicado' | 'arquivado';
  thumbnail_url?: string;
}

export interface UpdateModuloData {
  titulo: string;
  descricao: string | null;
  preco_centavos: number;
  gratuito: boolean;
  duracao_acesso_dias: number | null;
  carga_horaria: number | null;
  status: 'rascunho' | 'publicado' | 'arquivado';
}

export interface ModuloRow {
  id: string;
  produtor_id: string;
  titulo: string;
  slug: string;
  descricao: string | null;
  thumbnail_url: string | null;
  preco_centavos: number;
  moeda: string;
  gratuito: boolean;
  duracao_acesso_dias: number | null;
  carga_horaria: number | null;
  status: 'rascunho' | 'publicado' | 'arquivado';
  criado_em: string;
  atualizado_em: string;
  deletado_em: string | null;
}

export class ModuloService {
  static async create(produtorId: string, data: CreateModuloData): Promise<ModuloRow> {
    let slug = generateSlug(data.titulo);

    const existing = await query('SELECT id FROM modulos WHERE slug = $1', [slug]);
    if (existing.rows.length > 0) {
      slug = `${slug}-${Date.now()}`;
    }

    const result = await query(
      `INSERT INTO modulos (produtor_id, titulo, slug, descricao, preco_centavos, gratuito, duracao_acesso_dias, carga_horaria, status, thumbnail_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        produtorId,
        data.titulo,
        slug,
        data.descricao || null,
        data.preco_centavos,
        data.gratuito,
        data.duracao_acesso_dias || null,
        data.carga_horaria || null,
        data.status,
        data.thumbnail_url || null,
      ]
    );

    return result.rows[0] as ModuloRow;
  }

  static async update(id: string, data: UpdateModuloData): Promise<ModuloRow | null> {
    let slug = generateSlug(data.titulo);

    const existing = await query('SELECT id FROM modulos WHERE slug = $1 AND id != $2', [slug, id]);
    if (existing.rows.length > 0) {
      slug = `${slug}-${Date.now()}`;
    }

    const result = await query(
      `UPDATE modulos SET
        titulo = $1, slug = $2, descricao = $3,
        preco_centavos = $4, gratuito = $5,
        duracao_acesso_dias = $6, carga_horaria = $7, status = $8,
        atualizado_em = NOW()
       WHERE id = $9 AND deletado_em IS NULL
       RETURNING *`,
      [
        data.titulo,
        slug,
        data.descricao,
        data.preco_centavos,
        data.gratuito,
        data.duracao_acesso_dias,
        data.carga_horaria,
        data.status,
        id,
      ]
    );

    return (result.rows[0] as ModuloRow) || null;
  }

  static async findAll(): Promise<ModuloRow[]> {
    const result = await query(
      'SELECT * FROM modulos WHERE deletado_em IS NULL ORDER BY criado_em DESC'
    );
    return result.rows as ModuloRow[];
  }

  static async findPublic(): Promise<ModuloRow[]> {
    const result = await query(
      `SELECT * FROM modulos
       WHERE status = 'publicado' AND deletado_em IS NULL
       ORDER BY criado_em DESC`
    );
    return result.rows as ModuloRow[];
  }

  static async findById(id: string): Promise<ModuloRow | null> {
    const result = await query(
      'SELECT * FROM modulos WHERE id = $1 AND deletado_em IS NULL',
      [id]
    );
    return (result.rows[0] as ModuloRow) || null;
  }

  static async countStudents(moduloId: string): Promise<number> {
    const result = await query(
      'SELECT COUNT(DISTINCT usuario_id)::int as count FROM acessos_modulo WHERE modulo_id = $1',
      [moduloId]
    );
    return result.rows[0].count as number;
  }

  static async findPublicById(id: string): Promise<ModuloRow | null> {
    const result = await query(
      `SELECT * FROM modulos
       WHERE id = $1 AND status = 'publicado' AND deletado_em IS NULL`,
      [id]
    );
    return (result.rows[0] as ModuloRow) || null;
  }

  static async delete(id: string): Promise<void> {
    await query(
      'UPDATE modulos SET deletado_em = NOW() WHERE id = $1 AND deletado_em IS NULL',
      [id]
    );
  }

  static async uploadThumbnail(
    moduloId: string,
    buffer: Buffer,
    fileName: string,
    mimeType: string
  ): Promise<string> {
    const url = await uploadImage(buffer, fileName, mimeType);

    await query(
      'UPDATE modulos SET thumbnail_url = $1, atualizado_em = NOW() WHERE id = $2',
      [url, moduloId]
    );

    return url;
  }
}
