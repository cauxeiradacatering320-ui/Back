import { query } from '../lib/db';
import { uploadPDF } from '../lib/storage';
import PDFDocument from 'pdfkit';

export interface CertificadoRow {
  id: string;
  usuario_id: string;
  nome: string;
  modulo_id: string;
  codigo: string;
  pdf_url: string | null;
  emitido_em: string;
  criado_em: string;
}

export interface CertificadoComModulo extends CertificadoRow {
  modulo_titulo: string;
  modulo_carga_horaria: number | null;
}

export class CertificadoService {
  static async findByUser(usuarioId: string): Promise<CertificadoComModulo[]> {
    const result = await query(
      `SELECT c.*, m.titulo as modulo_titulo, m.carga_horaria as modulo_carga_horaria
       FROM certificados c
       JOIN modulos m ON m.id = c.modulo_id
       WHERE c.usuario_id = $1
       ORDER BY c.emitido_em DESC`,
      [usuarioId]
    );
    return result.rows as CertificadoComModulo[];
  }

  static async findByUserAndModulo(
    usuarioId: string,
    moduloId: string
  ): Promise<CertificadoComModulo | null> {
    const result = await query(
      `SELECT c.*, m.titulo as modulo_titulo, m.carga_horaria as modulo_carga_horaria
       FROM certificados c
       JOIN modulos m ON m.id = c.modulo_id
       WHERE c.usuario_id = $1 AND c.modulo_id = $2
       LIMIT 1`,
      [usuarioId, moduloId]
    );
    return (result.rows[0] as CertificadoComModulo) || null;
  }

  static async verificarConclusao(
    usuarioId: string,
    moduloId: string
  ): Promise<boolean> {
    const result = await query(
      `SELECT
         COUNT(c.id)::int AS total,
         COUNT(p.id) FILTER (WHERE p.completo = TRUE)::int AS completos
       FROM conteudos_modulo c
       LEFT JOIN progresso_conteudo p
         ON p.conteudo_modulo_id = c.id AND p.usuario_id = $1
       WHERE c.modulo_id = $2`,
      [usuarioId, moduloId]
    );
    const row = result.rows[0] as { total: number; completos: number };
    return row.total > 0 && row.total === row.completos;
  }

  static async gerar(
    usuarioId: string,
    moduloId: string,
    nome: string
  ): Promise<CertificadoRow> {
    const jaExiste = await this.findByUserAndModulo(usuarioId, moduloId);
    if (jaExiste) {
      throw new Error('Você já possui um certificado para este módulo.');
    }

    const concluido = await this.verificarConclusao(usuarioId, moduloId);
    if (!concluido) {
      throw new Error('Complete todas as lições para gerar o certificado.');
    }

    const modulo = await query(
      'SELECT * FROM modulos WHERE id = $1 AND deletado_em IS NULL',
      [moduloId]
    );
    if (modulo.rows.length === 0) {
      throw new Error('Módulo não encontrado.');
    }
    const moduloData = modulo.rows[0] as { titulo: string; carga_horaria: number | null };

    const usuario = await query(
      'SELECT * FROM usuarios WHERE id = $1',
      [usuarioId]
    );
    if (usuario.rows.length === 0) {
      throw new Error('Usuário não encontrado.');
    }

    const codigo = this.gerarCodigo();

    const pdfBuffer = await this.gerarPDF(
      nome,
      moduloData.titulo,
      moduloData.carga_horaria,
      codigo
    );

    const pdfUrl = await uploadPDF(pdfBuffer, `certificado-${codigo}.pdf`);

    const result = await query(
      `INSERT INTO certificados (usuario_id, nome, modulo_id, codigo, pdf_url)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [usuarioId, nome, moduloId, codigo, pdfUrl]
    );

    return result.rows[0] as CertificadoRow;
  }

  private static gerarCodigo(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let codigo = '';
    for (let i = 0; i < 12; i++) {
      if (i > 0 && i % 4 === 0) codigo += '-';
      codigo += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return codigo;
  }

  private static gerarPDF(
    nomeAluno: string,
    nomeCurso: string,
    cargaHoraria: number | null,
    codigo: string
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        layout: 'landscape',
        size: 'A4',
        margins: { top: 40, bottom: 40, left: 40, right: 40 },
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const pageWidth = doc.page.width;
      const pageHeight = doc.page.height;

      // Border decorativa
      doc.rect(15, 15, pageWidth - 30, pageHeight - 30)
        .lineWidth(2)
        .strokeColor('#D4AF37')
        .stroke();

      doc.rect(20, 20, pageWidth - 40, pageHeight - 40)
        .lineWidth(0.5)
        .strokeColor('#B87333')
        .stroke();

      // Título
      doc.fontSize(32)
        .font('Helvetica-Bold')
        .fillColor('#1a1a1a')
        .text('CERTIFICADO', { align: 'center' });

      doc.moveDown(0.5);

      doc.fontSize(14)
        .font('Helvetica')
        .fillColor('#666')
        .text('Certificamos que', { align: 'center' });

      doc.moveDown(0.8);

      // Nome do aluno
      doc.fontSize(28)
        .font('Helvetica-Bold')
        .fillColor('#D4AF37')
        .text(nomeAluno, { align: 'center' });

      doc.moveDown(0.8);

      doc.fontSize(14)
        .font('Helvetica')
        .fillColor('#666')
        .text('concluíu com êxito o curso', { align: 'center' });

      doc.moveDown(0.8);

      // Nome do curso
      doc.fontSize(24)
        .font('Helvetica-Bold')
        .fillColor('#1a1a1a')
        .text(nomeCurso, { align: 'center' });

      if (cargaHoraria) {
        doc.moveDown(0.5);
        doc.fontSize(12)
          .font('Helvetica')
          .fillColor('#666')
          .text(`Carga horária: ${cargaHoraria} horas`, { align: 'center' });
      }

      doc.moveDown(2);

      // Data e código
      const dataEmissao = new Date().toLocaleDateString('pt-PT', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });

      doc.fontSize(11)
        .font('Helvetica')
        .fillColor('#999')
        .text(`Emitido em ${dataEmissao}`, { align: 'center' });

      doc.moveDown(0.3);

      doc.fontSize(8)
        .fillColor('#bbb')
        .text(`Código de autenticação: ${codigo}`, { align: 'center' });

      doc.end();
    });
  }
}
