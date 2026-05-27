import { FastifyRequest, FastifyReply } from 'fastify';
import { query } from '../lib/db';

export async function listMeusModulos(request: FastifyRequest, reply: FastifyReply) {
  try {
    const usuarioId = request.user!.id;

    const result = await query(
      `SELECT a.id AS acesso_id, a.status AS acesso_status,
              a.iniciado_em, a.expira_em, a.origem_acesso,
              m.id, m.titulo, m.slug, m.descricao, m.thumbnail_url,
              m.preco_centavos, m.gratuito, m.duracao_acesso_dias,
              m.carga_horaria, m.status
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

export async function studentDashboard(request: FastifyRequest, reply: FastifyReply) {
  try {
    const usuarioId = request.user!.id;

    const totals = await query(
      `SELECT
         COUNT(DISTINCT m.id)::int AS total_modulos,
         COUNT(c.id)::int AS total_aulas,
         COUNT(p.id) FILTER (WHERE p.completo = TRUE)::int AS aulas_completas
       FROM acessos_modulo a
       JOIN modulos m ON m.id = a.modulo_id
       LEFT JOIN conteudos_modulo c ON c.modulo_id = m.id
       LEFT JOIN progresso_conteudo p ON p.conteudo_modulo_id = c.id AND p.usuario_id = $1
       WHERE a.usuario_id = $1
         AND a.status = 'ativo'
         AND (a.expira_em IS NULL OR a.expira_em > NOW())`,
      [usuarioId]
    );

    const { total_modulos, total_aulas, aulas_completas } = totals.rows[0];
    const porcentagem = total_aulas > 0 ? Math.round((aulas_completas / total_aulas) * 100) : 0;

    const proximaAula = await query(
      `SELECT c.id AS conteudo_id, c.titulo AS aula_titulo, c.posicao,
              m.id AS modulo_id, m.titulo AS modulo_titulo, m.thumbnail_url
       FROM acessos_modulo a
       JOIN modulos m ON m.id = a.modulo_id
       JOIN conteudos_modulo c ON c.modulo_id = m.id
       LEFT JOIN progresso_conteudo p ON p.conteudo_modulo_id = c.id AND p.usuario_id = $1
       WHERE a.usuario_id = $1
         AND a.status = 'ativo'
         AND (a.expira_em IS NULL OR a.expira_em > NOW())
         AND (p.completo IS NULL OR p.completo = FALSE)
       ORDER BY a.criado_em ASC, c.posicao ASC
       LIMIT 1`,
      [usuarioId]
    );

    const modulosComProgresso = await query(
      `SELECT m.id, m.titulo, m.thumbnail_url,
              COUNT(c.id)::int AS total_aulas,
              COUNT(p.id) FILTER (WHERE p.completo = TRUE)::int AS aulas_completas
       FROM acessos_modulo a
       JOIN modulos m ON m.id = a.modulo_id
       LEFT JOIN conteudos_modulo c ON c.modulo_id = m.id
       LEFT JOIN progresso_conteudo p ON p.conteudo_modulo_id = c.id AND p.usuario_id = $1
       WHERE a.usuario_id = $1
         AND a.status = 'ativo'
         AND (a.expira_em IS NULL OR a.expira_em > NOW())
       GROUP BY m.id, m.titulo, m.thumbnail_url
       ORDER BY MAX(a.criado_em) DESC`,
      [usuarioId]
    );

    return reply.send({
      total_modulos,
      total_aulas,
      aulas_completas,
      porcentagem,
      proxima_aula: proximaAula.rows[0] || null,
      modulos: modulosComProgresso.rows,
    });
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
