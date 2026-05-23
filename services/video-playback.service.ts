import { query } from '../lib/db';
import { ConteudoService } from './conteudo.service';
import { getVideoProvider } from '../providers/video';

export class VideoPlaybackService {
  static async getPlaybackUrl(conteudoId: string, usuarioId: string, role: string): Promise<string> {
    const conteudo = await ConteudoService.findById(conteudoId);
    if (!conteudo) {
      throw new Error('Conteúdo não encontrado');
    }
    if (conteudo.tipo !== 'video') {
      throw new Error('Conteúdo não é um vídeo');
    }

    const dados = conteudo.dados as Record<string, unknown>;
    const videoId = dados.videoId as string | undefined;
    if (!videoId) {
      throw new Error('Video ID não encontrado no conteúdo');
    }

    if (dados.status !== 'ready') {
      throw new Error('Vídeo ainda não está pronto');
    }

    if (role !== 'admin' && !conteudo.preview) {
      const acesso = await query(
        `SELECT id FROM acessos_modulo
         WHERE usuario_id = $1 AND modulo_id = $2 AND status = 'ativo'
         AND (expira_em IS NULL OR expira_em > NOW())
         LIMIT 1`,
        [usuarioId, conteudo.modulo_id]
      );

      if (acesso.rows.length === 0) {
        throw new Error('Você não tem acesso a este conteúdo');
      }
    }

    const provider = getVideoProvider();
    return provider.generatePlaybackUrl(videoId);
  }
}
