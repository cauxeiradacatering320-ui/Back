import { FastifyRequest, FastifyReply } from 'fastify';
import { query } from '../lib/db';

export async function criarCompraManual(
  request: FastifyRequest<{ Params: { usuarioId: string } }>,
  reply: FastifyReply
) {
  try {
    const { usuarioId } = request.params;
    const { itens } = request.body as {
      itens: { modulo_id: string; preco_centavos: number }[];
    };

    if (!itens || itens.length === 0) {
      return reply.status(400).send({ error: 'Selecione pelo menos um módulo' });
    }

    const usuarioCheck = await query('SELECT id FROM usuarios WHERE id = $1', [usuarioId]);
    if (usuarioCheck.rows.length === 0) {
      return reply.status(404).send({ error: 'Usuário não encontrado' });
    }

    let valorTotal = 0;
    for (const item of itens) {
      const mod = await query(
        'SELECT id, titulo, duracao_acesso_dias FROM modulos WHERE id = $1 AND deletado_em IS NULL',
        [item.modulo_id]
      );
      if (mod.rows.length === 0) {
        return reply.status(400).send({ error: `Módulo ${item.modulo_id} não encontrado` });
      }

      const exists = await query(
        'SELECT id FROM acessos_modulo WHERE usuario_id = $1 AND modulo_id = $2',
        [usuarioId, item.modulo_id]
      );
      if (exists.rows.length > 0) {
        return reply.status(400).send({ error: `Usuário já possui acesso ao módulo "${mod.rows[0].titulo}"` });
      }

      valorTotal += item.preco_centavos;
    }

    const compra = await query(
      `INSERT INTO compras (usuario_id, provider, transacao_provider_id, valor_pago_centavos, status, aprovado_em)
       VALUES ($1, 'manual', gen_random_uuid()::text, $2, 'aprovado', NOW())
       RETURNING *`,
      [usuarioId, valorTotal]
    );

    const compraId = compra.rows[0].id;

    for (const item of itens) {
      await query(
        `INSERT INTO itens_compra (compra_id, modulo_id, preco_pago_centavos)
         VALUES ($1, $2, $3)`,
        [compraId, item.modulo_id, item.preco_centavos]
      );

      const mod = await query(
        'SELECT duracao_acesso_dias FROM modulos WHERE id = $1',
        [item.modulo_id]
      );
      let expiraEm: string | null = null;
      if (mod.rows[0].duracao_acesso_dias) {
        const d = new Date();
        d.setDate(d.getDate() + mod.rows[0].duracao_acesso_dias);
        expiraEm = d.toISOString();
      }

      await query(
        `INSERT INTO acessos_modulo (usuario_id, modulo_id, compra_id, expira_em, origem_acesso)
         VALUES ($1, $2, $3, $4, 'manual')`,
        [usuarioId, item.modulo_id, compraId, expiraEm]
      );
    }

    const result = await query(
      `SELECT c.*, json_agg(json_build_object(
        'id', ic.id,
        'modulo_id', ic.modulo_id,
        'preco_pago_centavos', ic.preco_pago_centavos,
        'modulo_titulo', m.titulo
      )) AS itens
       FROM compras c
       JOIN itens_compra ic ON ic.compra_id = c.id
       JOIN modulos m ON m.id = ic.modulo_id
       WHERE c.id = $1
       GROUP BY c.id`,
      [compraId]
    );

    return reply.status(201).send(result.rows[0]);
  } catch (error: any) {
    return reply.status(400).send({ error: error.message });
  }
}
