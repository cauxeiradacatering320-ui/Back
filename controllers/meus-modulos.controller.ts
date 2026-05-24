import { FastifyRequest, FastifyReply } from 'fastify';
import { query } from '../lib/db';

export async function listMeusModulos(request: FastifyRequest, reply: FastifyReply) {
  try {
    const usuarioId = request.user!.id;

    const result = await query(
      `SELECT a.id AS acesso_id, a.status AS acesso_status,
              a.iniciado_em, a.expira_em, a.origem_acesso,
              m.id, m.titulo, m.slug, m.descricao, m.thumbnail_url,
              m.preco_centavos, m.gratuito, m.duracao_acesso_dias, m.status
       FROM acessos_modulo a
       JOIN modulos m ON m.id = a.modulo_id
       WHERE a.usuario_id = $1
         AND a.status = 'ativo'
         AND (a.expira_em IS NULL OR a.expira_em > NOW())
       ORDER BY a.criado_em DESC`,
      [usuarioId]
    );

    return reply.send(result.rows);
  } catch (error: any) {
    return reply.status(500).send({ error: error.message });
  }
}

export async function listRecomendados(request: FastifyRequest, reply: FastifyReply) {
  try {
    const usuarioId = request.user!.id;

    const result = await query(
      `SELECT m.* FROM modulos m
       WHERE m.status = 'publicado'
         AND m.deletado_em IS NULL
         AND m.id NOT IN (
           SELECT a.modulo_id FROM acessos_modulo a WHERE a.usuario_id = $1
         )
       ORDER BY m.criado_em DESC
       LIMIT 6`,
      [usuarioId]
    );

    return reply.send(result.rows);
  } catch (error: any) {
    return reply.status(500).send({ error: error.message });
  }
}
