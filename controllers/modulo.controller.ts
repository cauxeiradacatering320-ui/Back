import { FastifyRequest, FastifyReply } from 'fastify';
import { ModuloService, type CreateModuloData, type UpdateModuloData } from '../services/modulo.service';
import { uploadImage } from '../lib/storage';

const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE = 5 * 1024 * 1024;

export async function createModulo(request: FastifyRequest, reply: FastifyReply) {
  try {
    const produtorId = request.user!.id;

    const fields: Record<string, string> = {};
    let fileBuffer: Buffer | undefined;
    let fileMimeType: string | undefined;
    let fileName: string | undefined;

    for await (const part of request.parts()) {
      if (part.type === 'field') {
        fields[part.fieldname] = part.value as string;
      } else if (part.type === 'file') {
        if (!ALLOWED_MIMES.includes(part.mimetype)) {
          return reply.status(400).send({ error: 'Formato de imagem inválido. Use JPEG, PNG, WebP ou GIF.' });
        }
        const buf = await part.toBuffer();
        if (buf.length > MAX_FILE_SIZE) {
          return reply.status(400).send({ error: 'Imagem muito grande. Máximo 5MB.' });
        }
        fileBuffer = buf;
        fileMimeType = part.mimetype;
        fileName = part.filename;
      }
    }

    let thumbnail_url: string | undefined;
    if (fileBuffer && fileMimeType && fileName) {
      thumbnail_url = await uploadImage(fileBuffer, fileName, fileMimeType);
    }

    const data: CreateModuloData = {
      titulo: fields.titulo,
      descricao: fields.descricao || undefined,
      preco_centavos: Number(fields.preco_centavos),
      gratuito: fields.gratuito === 'true',
      duracao_acesso_dias: fields.duracao_acesso_dias ? Number(fields.duracao_acesso_dias) : undefined,
      carga_horaria: fields.carga_horaria ? Number(fields.carga_horaria) : undefined,
      status: (fields.status as 'rascunho' | 'publicado') || 'rascunho',
      thumbnail_url,
    };

    const modulo = await ModuloService.create(produtorId, data);

    return reply.status(201).send(modulo);
  } catch (error: any) {
    return reply.status(400).send({ error: error.message });
  }
}

export async function updateModulo(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  try {
    const modulo = await ModuloService.findById(request.params.id);
    if (!modulo) {
      return reply.status(404).send({ error: 'Módulo não encontrado' });
    }

    const body = request.body as UpdateModuloData;

    const updated = await ModuloService.update(request.params.id, body);

    return reply.send(updated);
  } catch (error: any) {
    return reply.status(400).send({ error: error.message });
  }
}

export async function listModulos(_request: FastifyRequest, reply: FastifyReply) {
  try {
    const modulos = await ModuloService.findAll();
    return reply.send(modulos);
  } catch (error: any) {
    return reply.status(500).send({ error: error.message });
  }
}

export async function listPublicModulos(_request: FastifyRequest, reply: FastifyReply) {
  try {
    const modulos = await ModuloService.findPublic();
    return reply.send(modulos);
  } catch (error: any) {
    return reply.status(500).send({ error: error.message });
  }
}

export async function getModulo(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  try {
    const modulo = await ModuloService.findById(request.params.id);

    if (!modulo) {
      return reply.status(404).send({ error: 'Módulo não encontrado' });
    }

    const total_alunos = await ModuloService.countStudents(request.params.id);

    return reply.send({ ...modulo, total_alunos });
  } catch (error: any) {
    return reply.status(500).send({ error: error.message });
  }
}

export async function getPublicModulo(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  try {
    const modulo = await ModuloService.findPublicById(request.params.id);

    if (!modulo) {
      return reply.status(404).send({ error: 'Módulo não encontrado' });
    }

    return reply.send(modulo);
  } catch (error: any) {
    return reply.status(500).send({ error: error.message });
  }
}

export async function deleteModulo(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  try {
    const modulo = await ModuloService.findById(request.params.id);
    if (!modulo) {
      return reply.status(404).send({ error: 'Módulo não encontrado' });
    }

    await ModuloService.delete(request.params.id);
    return reply.send({ message: 'Módulo excluído com sucesso' });
  } catch (error: any) {
    return reply.status(400).send({ error: error.message });
  }
}

export async function uploadThumbnail(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  try {
    const modulo = await ModuloService.findById(request.params.id);
    if (!modulo) {
      return reply.status(404).send({ error: 'Módulo não encontrado' });
    }

    const file = await request.file();

    if (!file) {
      return reply.status(400).send({ error: 'Nenhum arquivo enviado' });
    }

    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedMimes.includes(file.mimetype)) {
      return reply.status(400).send({ error: 'Formato de imagem inválido. Use JPEG, PNG, WebP ou GIF.' });
    }

    const buffer = await file.toBuffer();

    if (buffer.length > 5 * 1024 * 1024) {
      return reply.status(400).send({ error: 'Imagem muito grande. Máximo 5MB.' });
    }

    const url = await ModuloService.uploadThumbnail(
      request.params.id,
      buffer,
      file.filename,
      file.mimetype
    );

    return reply.send({ thumbnail_url: url });
  } catch (error: any) {
    return reply.status(500).send({ error: error.message });
  }
}
