import { FastifyRequest, FastifyReply } from 'fastify';
import { ConteudoService } from '../services/conteudo.service';
import { getVideoProvider } from '../providers/video';

interface BunnyWebhookPayload {
  VideoGuid?: string;
  Status?: number;
}

export async function handleBunnyWebhook(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const payload = request.body as BunnyWebhookPayload;

    if (!payload.VideoGuid || payload.Status === undefined) {
      return reply.status(400).send({ error: 'Payload inválido' });
    }

    const conteudo = await ConteudoService.findByVideoId(payload.VideoGuid);

    if (!conteudo) {
      return reply.status(404).send({ error: 'Conteúdo não encontrado para este vídeo' });
    }

    const provider = getVideoProvider();
    const status = provider.parseWebhookStatus(payload.Status);

    await ConteudoService.updateStatus(conteudo.id, status);

    if (status === 'error') {
      console.error(`Webhook: vídeo ${payload.VideoGuid} erro de processamento`);
    }

    return reply.status(200).send({ received: true });
  } catch (error: any) {
    console.error('Webhook error:', error.message);
    return reply.status(500).send({ error: error.message });
  }
}
