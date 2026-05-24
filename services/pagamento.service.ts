import { query } from '../lib/db';

export interface PagamentoRow {
  id: string;
  usuario_id: string;
  cliente_nome: string;
  cliente_email: string;
  provider: string;
  transacao_provider_id: string | null;
  valor_pago_centavos: number;
  moeda: string;
  status: string;
  aprovado_em: string | null;
  criado_em: string;
  modulos: string;
}

export interface PagamentoFiltros {
  dataInicio?: string;
  dataFim?: string;
  cliente?: string;
}

export interface PagamentosResponse {
  pagamentos: PagamentoRow[];
  totalCentavos: number;
  total: number;
}

export class PagamentoService {
  static async listar(filtros: PagamentoFiltros): Promise<PagamentosResponse> {
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (filtros.dataInicio) {
      conditions.push(`c.criado_em >= $${paramIndex++}`);
      params.push(filtros.dataInicio);
    }

    if (filtros.dataFim) {
      conditions.push(`c.criado_em <= $${paramIndex++}`);
      params.push(filtros.dataFim);
    }

    if (filtros.cliente) {
      conditions.push(`(LOWER(u.nome) LIKE LOWER($${paramIndex}) OR LOWER(u.email) LIKE LOWER($${paramIndex}))`);
      params.push(`%${filtros.cliente}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const sql = `
      SELECT
        c.id,
        c.usuario_id,
        u.nome AS cliente_nome,
        u.email AS cliente_email,
        c.provider,
        c.transacao_provider_id,
        c.valor_pago_centavos,
        c.moeda,
        c.status,
        c.aprovado_em,
        c.criado_em,
        COALESCE(
          (SELECT STRING_AGG(m.titulo, ', ') FROM itens_compra ic JOIN modulos m ON m.id = ic.modulo_id WHERE ic.compra_id = c.id),
          ''
        ) AS modulos
      FROM compras c
      JOIN usuarios u ON u.id = c.usuario_id
      ${whereClause}
      ORDER BY c.criado_em DESC
    `;

    const result = await query(sql, params);

    const pagamentos = result.rows as PagamentoRow[];

    const totalCentavos = pagamentos.reduce((sum, p) => sum + Number(p.valor_pago_centavos), 0);

    return {
      pagamentos,
      totalCentavos,
      total: pagamentos.length,
    };
  }
}
