import { query } from '../lib/db';

export interface VendasPorModulo {
  titulo: string;
  total_vendas: number;
  faturamento: number;
}

export interface DashboardData {
  totalCursos: number;
  cursoMaisVendido: { titulo: string; total_vendas: number } | null;
  faturamentoTotal: number;
  totalAlunos: number;
  vendasPorModulo: VendasPorModulo[];
}

export class DashboardService {
  static async getData(): Promise<DashboardData> {
    const [totalCursos, cursoMaisVendido, faturamentoTotal, totalAlunos, vendasPorModulo] =
      await Promise.all([
        this.getTotalCursos(),
        this.getCursoMaisVendido(),
        this.getFaturamentoTotal(),
        this.getTotalAlunos(),
        this.getVendasPorModulo(),
      ]);

    return {
      totalCursos,
      cursoMaisVendido,
      faturamentoTotal,
      totalAlunos,
      vendasPorModulo,
    };
  }

  private static async getTotalCursos(): Promise<number> {
    const result = await query(
      `SELECT COUNT(*)::int as count FROM modulos WHERE status = 'publicado' AND deletado_em IS NULL`
    );
    return result.rows[0].count;
  }

  private static async getCursoMaisVendido(): Promise<{ titulo: string; total_vendas: number } | null> {
    const result = await query(
      `SELECT m.titulo, COUNT(ic.id)::int as total_vendas
       FROM itens_compra ic
       JOIN compras c ON c.id = ic.compra_id
       JOIN modulos m ON m.id = ic.modulo_id
       WHERE c.status = 'aprovado'
       GROUP BY m.id, m.titulo
       ORDER BY total_vendas DESC
       LIMIT 1`
    );
    return result.rows[0] || null;
  }

  private static async getFaturamentoTotal(): Promise<number> {
    const result = await query(
      `SELECT COALESCE(SUM(valor_pago_centavos), 0)::int as total FROM compras WHERE status = 'aprovado'`
    );
    return result.rows[0].total;
  }

  private static async getTotalAlunos(): Promise<number> {
    const result = await query(
      `SELECT COUNT(DISTINCT usuario_id)::int as count FROM acessos_modulo WHERE status = 'ativo'`
    );
    return result.rows[0].count;
  }

  private static async getVendasPorModulo(): Promise<VendasPorModulo[]> {
    const result = await query(
      `SELECT m.titulo, COUNT(ic.id)::int as total_vendas, COALESCE(SUM(ic.preco_pago_centavos), 0)::int as faturamento
       FROM itens_compra ic
       JOIN compras c ON c.id = ic.compra_id
       JOIN modulos m ON m.id = ic.modulo_id
       WHERE c.status = 'aprovado'
       GROUP BY m.id, m.titulo
       ORDER BY total_vendas DESC`
    );
    return result.rows as VendasPorModulo[];
  }
}
