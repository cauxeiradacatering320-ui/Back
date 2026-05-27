import { FastifyRequest, FastifyReply } from 'fastify';
import { CertificadoService } from '../services/certificado.service';

export async function listarCertificados(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const usuarioId = request.user!.id;
    const certificados = await CertificadoService.findByUser(usuarioId);
    return reply.send(certificados);
  } catch (error: any) {
    return reply.status(500).send({ error: error.message });
  }
}

export async function verificarCertificado(
  request: FastifyRequest<{ Params: { moduloId: string } }>,
  reply: FastifyReply
) {
  try {
    const usuarioId = request.user!.id;
    const certificado = await CertificadoService.findByUserAndModulo(
      usuarioId,
      request.params.moduloId
    );
    return reply.send({ certificado });
  } catch (error: any) {
    return reply.status(500).send({ error: error.message });
  }
}

export async function gerarCertificado(
  request: FastifyRequest<{ Params: { moduloId: string }; Body: { nome: string } }>,
  reply: FastifyReply
) {
  try {
    const usuarioId = request.user!.id;
    const { moduloId } = request.params;
    const { nome } = request.body;

    if (!nome || !nome.trim()) {
      return reply.status(400).send({ error: 'O nome para o certificado é obrigatório.' });
    }

    const certificado = await CertificadoService.gerar(usuarioId, moduloId, nome.trim());
    return reply.status(201).send(certificado);
  } catch (error: any) {
    if (
      error.message.includes('já possui um certificado') ||
      error.message.includes('Complete todas as lições')
    ) {
      return reply.status(400).send({ error: error.message });
    }
    return reply.status(500).send({ error: error.message });
  }
}
