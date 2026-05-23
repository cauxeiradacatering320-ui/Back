import { FastifyRequest, FastifyReply } from 'fastify';
import { ConteudoService, UpdateConteudoData } from '../services/conteudo.service';

export async function createVideoConteudo(
  request: FastifyRequest<{ Params: { moduloId: string } }>,
  reply: FastifyReply
) {
  try {
    const { moduloId } = request.params;
    const { titulo } = request.body as { titulo: string };

    if (!titulo || titulo.trim().length === 0) {
      return reply.status(400).send({ error: 'Título é obrigatório' });
    }

    const { conteudo, uploadUrl } = await ConteudoService.createVideo({
      moduloId,
      titulo: titulo.trim(),
    });

    return reply.status(201).send({ ...conteudo, uploadUrl });
  } catch (error: any) {
    return reply.status(400).send({ error: error.message });
  }
}

export async function createTextConteudo(
  request: FastifyRequest<{ Params: { moduloId: string } }>,
  reply: FastifyReply
) {
  try {
    const { moduloId } = request.params;
    const { titulo, content } = request.body as { titulo: string; content: string };

    if (!titulo || titulo.trim().length === 0) {
      return reply.status(400).send({ error: 'Título é obrigatório' });
    }

    const conteudo = await ConteudoService.createText({
      moduloId,
      titulo: titulo.trim(),
      content: content || '',
    });

    return reply.status(201).send(conteudo);
  } catch (error: any) {
    return reply.status(400).send({ error: error.message });
  }
}

export async function listConteudos(
  request: FastifyRequest<{ Params: { moduloId: string } }>,
  reply: FastifyReply
) {
  try {
    const { moduloId } = request.params;
    const conteudos = await ConteudoService.findByModulo(moduloId);
    return reply.send(conteudos);
  } catch (error: any) {
    return reply.status(500).send({ error: error.message });
  }
}

export async function getConteudo(
  request: FastifyRequest<{ Params: { moduloId: string; id: string } }>,
  reply: FastifyReply
) {
  try {
    const conteudo = await ConteudoService.findById(request.params.id);

    if (!conteudo) {
      return reply.status(404).send({ error: 'Conteúdo não encontrado' });
    }

    return reply.send(conteudo);
  } catch (error: any) {
    return reply.status(500).send({ error: error.message });
  }
}

export async function syncConteudoStatus(
  request: FastifyRequest<{ Params: { moduloId: string; id: string } }>,
  reply: FastifyReply
) {
  try {
    const conteudo = await ConteudoService.syncVideoStatus(request.params.id);

    if (!conteudo) {
      return reply.status(404).send({ error: 'Conteúdo não encontrado' });
    }

    return reply.send(conteudo);
  } catch (error: any) {
    return reply.status(500).send({ error: error.message });
  }
}

export async function updateConteudo(
  request: FastifyRequest<{ Params: { moduloId: string; id: string } }>,
  reply: FastifyReply
) {
  try {
    const conteudo = await ConteudoService.findById(request.params.id);
    if (!conteudo) {
      return reply.status(404).send({ error: 'Conteúdo não encontrado' });
    }

    const body = request.body as UpdateConteudoData;
    const updated = await ConteudoService.update(request.params.id, body);
    return reply.send(updated);
  } catch (error: any) {
    return reply.status(400).send({ error: error.message });
  }
}

export async function reorderConteudos(
  request: FastifyRequest<{ Params: { moduloId: string } }>,
  reply: FastifyReply
) {
  try {
    const { orderedIds } = request.body as { orderedIds: string[] };
    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      return reply.status(400).send({ error: 'orderedIds é obrigatório' });
    }

    const conteudos = await ConteudoService.reorder(request.params.moduloId, orderedIds);
    return reply.send(conteudos);
  } catch (error: any) {
    return reply.status(400).send({ error: error.message });
  }
}

export async function deleteConteudo(
  request: FastifyRequest<{ Params: { moduloId: string; id: string } }>,
  reply: FastifyReply
) {
  try {
    const conteudo = await ConteudoService.findById(request.params.id);

    if (!conteudo) {
      return reply.status(404).send({ error: 'Conteúdo não encontrado' });
    }

    await ConteudoService.delete(request.params.id);

    return reply.status(204).send();
  } catch (error: any) {
    return reply.status(500).send({ error: error.message });
  }
}
