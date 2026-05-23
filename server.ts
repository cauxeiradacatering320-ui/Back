import fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import multipart from '@fastify/multipart';
import { authRoutes } from './routes/auth.routes';
import { adminModuloRoutes, publicModuloRoutes } from './routes/modulo.routes';
import { adminConteudoRoutes } from './routes/conteudo.routes';
import { webhookRoutes } from './routes/webhook.routes';
import { videoPlaybackRoutes } from './routes/video-playback.routes';

const app = fastify({
  logger: true,
  bodyLimit: 10 * 1024 * 1024,
});

// Registrar Plugins
app.register(cors, {
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});

app.register(cookie, {
  secret: process.env.COOKIE_SECRET || "my-secret-cookie-signature-key",
  hook: 'onRequest'
});

app.register(multipart, {
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

// Registrar Rotas
app.register(authRoutes, { prefix: '/api/auth' });
app.register(adminModuloRoutes, { prefix: '/api/admin/modulos' });
app.register(adminConteudoRoutes, { prefix: '/api/admin/modulos' });
app.register(publicModuloRoutes, { prefix: '/api/modulos' });
app.register(webhookRoutes, { prefix: '/webhooks' });
app.register(videoPlaybackRoutes, { prefix: '/api/videos' });

const start = async () => {
  try {
    const port = process.env.PORT ? parseInt(process.env.PORT) : 3333;
    await app.listen({ port, host: '0.0.0.0' });
    console.log(`Servidor rodando em http://localhost:${port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
