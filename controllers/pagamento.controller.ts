import { FastifyRequest, FastifyReply } from 'fastify';
import { PagamentoService, type PagamentoFiltros } from '../services/pagamento.service';

export async function listarPagamentos(
  request: FastifyRequest<{ Querystring: PagamentoFiltros }>,
  reply: FastifyReply
) {
  try {
    const filtros: PagamentoFiltros = {
      dataInicio: request.query.dataInicio,
      dataFim: request.query.dataFim,
      cliente: request.query.cliente,
    };

    const data = await PagamentoService.listar(filtros);
    return reply.send(data);
  } catch (error: any) {
    return reply.status(500).send({ error: error.message });
  }
}
