import { FastifyInstance } from 'fastify';
import { authenticate } from '../middlewares/auth';
import { getVideoPlayback } from '../controllers/video-playback.controller';

export async function videoPlaybackRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);

  app.get('/:conteudoId/play', getVideoPlayback);
}
