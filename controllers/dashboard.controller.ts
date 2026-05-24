import { FastifyRequest, FastifyReply } from 'fastify';
import { DashboardService } from '../services/dashboard.service';

export async function getDashboardData(_request: FastifyRequest, reply: FastifyReply) {
  try {
    const data = await DashboardService.getData();
    return reply.send(data);
  } catch (error: any) {
    return reply.status(500).send({ error: error.message });
  }
}
