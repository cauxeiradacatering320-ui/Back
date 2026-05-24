import { FastifyRequest, FastifyReply } from 'fastify';
import { query } from '../lib/db';

export async function listMinhasCompras(request: FastifyRequest, reply: FastifyReply) {
  try {
    const usuarioId = request.user!.id;

    const result = await query(
      `SELECT c.*, json_agg(json_build_object(
        'id', ic.id,
        'modulo_id', ic.modulo_id,
        'preco_pago_centavos', ic.preco_pago_centavos,
        'modulo_titulo', m.titulo,
        'modulo_thumbnail', m.thumbnail_url
      ) ORDER BY ic.criado_em) AS itens
       FROM compras c
       JOIN itens_compra ic ON ic.compra_id = c.id
       JOIN modulos m ON m.id = ic.modulo_id
       WHERE c.usuario_id = $1
       GROUP BY c.id
       ORDER BY c.criado_em DESC`,
      [usuarioId]
    );

    return reply.send(result.rows);
  } catch (error: any) {
    return reply.status(500).send({ error: error.message });
  }
}
