import { FastifyRequest, FastifyReply } from 'fastify';
import { VideoPlaybackService } from '../services/video-playback.service';

export async function getVideoPlayback(
  request: FastifyRequest<{ Params: { conteudoId: string } }>,
  reply: FastifyReply
) {
  try {
    const { conteudoId } = request.params;
    const usuarioId = request.user!.id;
    const role = request.user!.role;

    const url = await VideoPlaybackService.getPlaybackUrl(conteudoId, usuarioId, role);

    return reply.send({ url });
  } catch (error: any) {
    const status = error.message.includes('não encontrado') ? 404
      : error.message.includes('não é um vídeo') ? 400
      : error.message.includes('não está pronto') ? 400
      : error.message.includes('não tem acesso') ? 403
      : 500;

    return reply.status(status).send({ error: error.message });
  }
}
