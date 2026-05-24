import { FastifyRequest, FastifyReply } from 'fastify';
import { query } from '../lib/db';

async function verificarAcesso(usuarioId: string, moduloId: string) {
  const acesso = await query(
    `SELECT id FROM acessos_modulo
     WHERE usuario_id = $1 AND modulo_id = $2 AND status = 'ativo'
       AND (expira_em IS NULL OR expira_em > NOW())`,
    [usuarioId, moduloId]
  );
  if (acesso.rows.length === 0) {
    throw new Error('Você não tem acesso a este módulo');
  }
}

export async function listConteudosComProgresso(
  request: FastifyRequest<{ Params: { moduloId: string } }>,
  reply: FastifyReply
) {
  try {
    const usuarioId = request.user!.id;
    const { moduloId } = request.params;

    await verificarAcesso(usuarioId, moduloId);

    const result = await query(
      `SELECT c.*,
              p.id AS progresso_id,
              p.completo AS progresso_completo,
              p.porcentagem AS progresso_porcentagem,
              p.completado_em AS progresso_completado_em
       FROM conteudos_modulo c
       LEFT JOIN progresso_conteudo p
         ON p.conteudo_modulo_id = c.id AND p.usuario_id = $1
       WHERE c.modulo_id = $2
       ORDER BY c.posicao ASC`,
      [usuarioId, moduloId]
    );

    return reply.send(result.rows);
  } catch (error: any) {
    return reply.status(500).send({ error: error.message });
  }
}

export async function marcarCompleto(
  request: FastifyRequest<{ Params: { moduloId: string; conteudoId: string } }>,
  reply: FastifyReply
) {
  try {
    const usuarioId = request.user!.id;
    const { moduloId, conteudoId } = request.params;

    await verificarAcesso(usuarioId, moduloId);

    const result = await query(
      `INSERT INTO progresso_conteudo (usuario_id, conteudo_modulo_id, completo, porcentagem, completado_em)
       VALUES ($1, $2, TRUE, 100, NOW())
       ON CONFLICT (usuario_id, conteudo_modulo_id)
       DO UPDATE SET completo = TRUE, porcentagem = 100, completado_em = NOW(), atualizado_em = NOW()
       RETURNING *`,
      [usuarioId, conteudoId]
    );

    return reply.send(result.rows[0]);
  } catch (error: any) {
    return reply.status(400).send({ error: error.message });
  }
}
