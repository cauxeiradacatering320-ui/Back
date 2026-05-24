import { FastifyRequest, FastifyReply } from 'fastify';
import { AcessoService } from '../services/acesso.service';

export async function listAcessos(
  request: FastifyRequest<{ Params: { usuarioId: string } }>,
  reply: FastifyReply
) {
  try {
    const acessos = await AcessoService.findByUsuario(request.params.usuarioId);
    return reply.send(acessos);
  } catch (error: any) {
    return reply.status(500).send({ error: error.message });
  }
}

export async function listModulosDisponiveis(
  request: FastifyRequest<{ Params: { usuarioId: string } }>,
  reply: FastifyReply
) {
  try {
    const modulos = await AcessoService.findModulosDisponiveis(request.params.usuarioId);
    return reply.send(modulos);
  } catch (error: any) {
    return reply.status(500).send({ error: error.message });
  }
}

export async function createAcesso(
  request: FastifyRequest<{ Params: { usuarioId: string } }>,
  reply: FastifyReply
) {
  try {
      const body = request.body as { modulo_id: string; expira_em?: string | null };
    const acesso = await AcessoService.create(request.params.usuarioId, {
      modulo_id: body.modulo_id,
      expira_em: body.expira_em ?? null,
    } as { modulo_id: string; expira_em: string | null });
    return reply.status(201).send(acesso);
  } catch (error: any) {
    return reply.status(400).send({ error: error.message });
  }
}

export async function updateAcesso(
  request: FastifyRequest<{ Params: { usuarioId: string; acessoId: string } }>,
  reply: FastifyReply
) {
  try {
    const body = request.body as { expira_em?: string | null; status?: string };
    const updated = await AcessoService.update(request.params.acessoId, {
      expira_em: body.expira_em ?? null,
      status: body.status as 'ativo' | 'expirado' | 'cancelado' | 'bloqueado' | undefined,
    });
    if (!updated) {
      return reply.status(404).send({ error: 'Acesso não encontrado' });
    }
    return reply.send(updated);
  } catch (error: any) {
    return reply.status(400).send({ error: error.message });
  }
}

export async function deleteAcesso(
  request: FastifyRequest<{ Params: { usuarioId: string; acessoId: string } }>,
  reply: FastifyReply
) {
  try {
    const deleted = await AcessoService.delete(request.params.acessoId);
    if (!deleted) {
      return reply.status(404).send({ error: 'Acesso não encontrado' });
    }
    return reply.status(204).send();
  } catch (error: any) {
    return reply.status(500).send({ error: error.message });
  }
}
