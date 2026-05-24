import { FastifyRequest, FastifyReply } from 'fastify';
import { UsuarioService, type CreateUsuarioData, type UpdateUsuarioData } from '../services/usuario.service';

export async function listUsuarios(_request: FastifyRequest, reply: FastifyReply) {
  try {
    const usuarios = await UsuarioService.findAll();
    return reply.send(usuarios);
  } catch (error: any) {
    return reply.status(500).send({ error: error.message });
  }
}

export async function getUsuario(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  try {
    const usuario = await UsuarioService.findById(request.params.id);
    if (!usuario) {
      return reply.status(404).send({ error: 'Usuário não encontrado' });
    }
    return reply.send(usuario);
  } catch (error: any) {
    return reply.status(500).send({ error: error.message });
  }
}

export async function createUsuario(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const body = request.body as CreateUsuarioData;
    const usuario = await UsuarioService.create(body);
    return reply.status(201).send(usuario);
  } catch (error: any) {
    return reply.status(400).send({ error: error.message });
  }
}

export async function updateUsuario(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  try {
    const usuario = await UsuarioService.findById(request.params.id);
    if (!usuario) {
      return reply.status(404).send({ error: 'Usuário não encontrado' });
    }

    const body = request.body as UpdateUsuarioData;
    const updated = await UsuarioService.update(request.params.id, body);
    return reply.send(updated);
  } catch (error: any) {
    return reply.status(400).send({ error: error.message });
  }
}

export async function toggleUsuarioActive(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  try {
    const usuario = await UsuarioService.findById(request.params.id);
    if (!usuario) {
      return reply.status(404).send({ error: 'Usuário não encontrado' });
    }

    const updated = await UsuarioService.toggleActive(request.params.id);
    return reply.send(updated);
  } catch (error: any) {
    return reply.status(500).send({ error: error.message });
  }
}

export async function deleteUsuario(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  try {
    const usuario = await UsuarioService.findById(request.params.id);
    if (!usuario) {
      return reply.status(404).send({ error: 'Usuário não encontrado' });
    }

    if (usuario.id === request.user!.id) {
      return reply.status(400).send({ error: 'Você não pode excluir a si mesmo' });
    }

    await UsuarioService.softDelete(request.params.id);
    return reply.status(204).send();
  } catch (error: any) {
    return reply.status(500).send({ error: error.message });
  }
}
