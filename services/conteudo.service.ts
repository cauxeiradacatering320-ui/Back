import { query } from '../lib/db';
import { getVideoProvider } from '../providers/video';

export interface ConteudoRow {
  id: string;
  modulo_id: string;
  tipo: 'video' | 'texto' | 'questao';
  titulo: string;
  posicao: number;
  preview: boolean;
  dados: Record<string, unknown>;
  criado_em: string;
  atualizado_em: string;
}

export interface UpdateConteudoData {
  titulo?: string;
  content?: string;
}

interface CreateVideoParams {
  moduloId: string;
  titulo: string;
}

interface CreateVideoResult {
  conteudo: ConteudoRow;
  uploadUrl: string;
}

interface CreateTextParams {
  moduloId: string;
  titulo: string;
  content: string;
}

export class ConteudoService {
  static async findByModulo(moduloId: string): Promise<ConteudoRow[]> {
    const result = await query(
      `SELECT * FROM conteudos_modulo
       WHERE modulo_id = $1
       ORDER BY posicao ASC`,
      [moduloId]
    );
    return result.rows as ConteudoRow[];
  }

  static async findById(id: string): Promise<ConteudoRow | null> {
    const result = await query(
      'SELECT * FROM conteudos_modulo WHERE id = $1',
      [id]
    );
    return (result.rows[0] as ConteudoRow) || null;
  }

  static async createVideo(params: CreateVideoParams): Promise<CreateVideoResult> {
    const provider = getVideoProvider();

    const { videoId, uploadUrl } = await provider.createVideo(params.titulo);

    const thumbnailUrl = provider.getThumbnailUrl(videoId);

    const maxPosResult = await query(
      'SELECT COALESCE(MAX(posicao), 0) AS max_pos FROM conteudos_modulo WHERE modulo_id = $1',
      [params.moduloId]
    );
    const posicao = (maxPosResult.rows[0]?.max_pos || 0) + 1;
    const libraryId = process.env.BUNNY_LIBRARY_ID || '';

    const dados = {
      provider: 'bunny',
      videoId,
      libraryId,
      thumbnailUrl,
      duration: 0,
      status: 'pending_upload',
    };

    const result = await query(
      `INSERT INTO conteudos_modulo (modulo_id, tipo, titulo, posicao, preview, dados)
       VALUES ($1, 'video', $2, $3, false, $4)
       RETURNING *`,
      [params.moduloId, params.titulo, posicao, JSON.stringify(dados)]
    );

    const conteudo = result.rows[0] as ConteudoRow;

    return { conteudo, uploadUrl };
  }

  static async createText(params: CreateTextParams): Promise<ConteudoRow> {
    const maxPosResult = await query(
      'SELECT COALESCE(MAX(posicao), 0) AS max_pos FROM conteudos_modulo WHERE modulo_id = $1',
      [params.moduloId]
    );
    const posicao = (maxPosResult.rows[0]?.max_pos || 0) + 1;

    const dados = {
      content: params.content,
    };

    const result = await query(
      `INSERT INTO conteudos_modulo (modulo_id, tipo, titulo, posicao, preview, dados)
       VALUES ($1, 'texto', $2, $3, false, $4)
       RETURNING *`,
      [params.moduloId, params.titulo, posicao, JSON.stringify(dados)]
    );

    return result.rows[0] as ConteudoRow;
  }

  static async syncVideoStatus(id: string): Promise<ConteudoRow | null> {
    const conteudo = await this.findById(id);
    if (!conteudo) return null;
    if (conteudo.tipo !== 'video') return conteudo;

    const dados = conteudo.dados as Record<string, unknown>;
    const videoId = dados.videoId as string | undefined;
    if (!videoId) return conteudo;

    const provider = getVideoProvider();
    const info = await provider.getVideoInfo(videoId);

    const result = await query(
  `UPDATE conteudos_modulo
   SET dados = jsonb_set(
     jsonb_set(
       jsonb_set(
         dados,
         '{status}',
         CASE
           WHEN $1::text IS NOT NULL
           THEN to_jsonb($1::text)
           ELSE dados->'status'
         END
       ),
       '{duration}',
       CASE
         WHEN $2::integer IS NOT NULL
         THEN to_jsonb($2::integer)
         ELSE dados->'duration'
       END
     ),
     '{thumbnailUrl}',
     CASE
       WHEN $3::text IS NOT NULL
       THEN to_jsonb($3::text)
       ELSE dados->'thumbnailUrl'
     END
   ),
   atualizado_em = NOW()
   WHERE id = $4
   RETURNING *`,
  [
    info.status || null,
    info.duration > 0 ? info.duration : null,
    info.thumbnailUrl || null,
    id,
  ]
);

    return (result.rows[0] as ConteudoRow) || null;
  }

  static async updateStatus(id: string, status: string): Promise<void> {
    await query(
      `UPDATE conteudos_modulo
       SET dados = jsonb_set(dados, '{status}', to_jsonb($1::text)),
           atualizado_em = NOW()
       WHERE id = $2`,
      [status, id]
    );
  }

  static async updateVideoDuration(id: string, duration: number): Promise<void> {
    await query(
      `UPDATE conteudos_modulo
       SET dados = jsonb_set(dados, '{duration}', to_jsonb($1::integer)),
           atualizado_em = NOW()
       WHERE id = $2`,
      [duration, id]
    );
  }

  static async findByVideoId(videoId: string): Promise<ConteudoRow | null> {
    const result = await query(
      `SELECT * FROM conteudos_modulo
       WHERE tipo = 'video' AND dados->>'videoId' = $1
       LIMIT 1`,
      [videoId]
    );
    return (result.rows[0] as ConteudoRow) || null;
  }

  static async update(id: string, data: UpdateConteudoData): Promise<ConteudoRow | null> {
    const sets: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (data.titulo !== undefined) {
      sets.push(`titulo = $${idx++}`);
      values.push(data.titulo);
    }

    if (data.content !== undefined) {
      sets.push(`dados = jsonb_set(COALESCE(dados, '{}'::jsonb), '{content}', $${idx++}::jsonb)`);
      values.push(JSON.stringify(data.content));
    }

    if (sets.length === 0) return this.findById(id);

    sets.push(`atualizado_em = NOW()`);

    const result = await query(
      `UPDATE conteudos_modulo SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
      [...values, id]
    );

    return (result.rows[0] as ConteudoRow) || null;
  }

  static async reorder(moduloId: string, orderedIds: string[]): Promise<ConteudoRow[]> {
    const promises = orderedIds.map((id, index) =>
      query(
        `UPDATE conteudos_modulo SET posicao = $1, atualizado_em = NOW()
         WHERE id = $2 AND modulo_id = $3`,
        [index + 1, id, moduloId]
      )
    );
    await Promise.all(promises);
    return this.findByModulo(moduloId);
  }

  static async delete(id: string): Promise<void> {
    const conteudo = await this.findById(id);
    if (!conteudo) return;

    if (conteudo.tipo === 'video') {
      const dados = conteudo.dados as Record<string, unknown>;
      const videoId = dados.videoId as string | undefined;
      if (videoId) {
        const provider = getVideoProvider();
        await provider.deleteVideo(videoId).catch((err) => {
          console.warn(`Erro ao deletar vídeo ${videoId} do Bunny:`, err.message);
        });
      }
    }

    await query('DELETE FROM conteudos_modulo WHERE id = $1', [id]);
  }
}
