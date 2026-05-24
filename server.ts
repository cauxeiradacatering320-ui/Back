import fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import multipart from '@fastify/multipart';
import { authRoutes } from './routes/auth.routes';
import { adminModuloRoutes, publicModuloRoutes } from './routes/modulo.routes';
import { adminConteudoRoutes } from './routes/conteudo.routes';
import { adminUsuarioRoutes } from './routes/usuario.routes';
import { adminAcessoRoutes } from './routes/acesso.routes';
import { webhookRoutes } from './routes/webhook.routes';
import { videoPlaybackRoutes } from './routes/video-playback.routes';
import { meusModulosRoutes } from './routes/meus-modulos.routes';
import { studentConteudoRoutes } from './routes/student-conteudo.routes';
import { adminCompraManualRoutes } from './routes/compra-manual.routes';
import { minhasComprasRoutes } from './routes/minhas-compras.routes';
import { adminDashboardRoutes } from './routes/dashboard.routes';
import { adminPagamentoRoutes } from './routes/pagamento.routes';

const app = fastify({
  logger: true,
  bodyLimit: 10 * 1024 * 1024,
});

// Registrar Plugins
app.register(cors, {
  origin: ["http://localhost:3000","https://front-ashy-ten-79.vercel.app"],
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
app.get('/', async(request,reply) =>{
  return {mensagem:"Api rodando!"}
})
app.register(authRoutes, { prefix: '/api/auth' });
app.register(adminModuloRoutes, { prefix: '/api/admin/modulos' });
app.register(adminConteudoRoutes, { prefix: '/api/admin/modulos' });
app.register(adminUsuarioRoutes, { prefix: '/api/admin/usuarios' });
app.register(adminAcessoRoutes, { prefix: '/api/admin/usuarios' });
app.register(publicModuloRoutes, { prefix: '/api/modulos' });
app.register(webhookRoutes, { prefix: '/webhooks' });
app.register(videoPlaybackRoutes, { prefix: '/api/videos' });
app.register(meusModulosRoutes, { prefix: '/api/meus-modulos' });
app.register(studentConteudoRoutes, { prefix: '/api/modulos' });
app.register(adminCompraManualRoutes, { prefix: '/api/admin/usuarios' });
app.register(adminDashboardRoutes, { prefix: '/api/admin/dashboard' });
app.register(adminPagamentoRoutes, { prefix: '/api/admin/pagamentos' });
app.register(minhasComprasRoutes, { prefix: '/api/minhas-compras' });

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
