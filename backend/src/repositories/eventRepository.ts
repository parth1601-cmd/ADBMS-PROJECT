import { prisma } from '../utils/prisma.js'
import { TxClient } from '../utils/transaction.js'

export const eventRepository = {
  create: (data: any, tx?: TxClient) => (tx || prisma).examEvent.create({ data }),
  createMany: (data: any[], tx?: TxClient) => (tx || prisma).examEvent.createMany({ data }),
  findBySession: (sessionId: string, tx?: TxClient) =>
    (tx || prisma).examEvent.findMany({ where: { sessionId }, orderBy: { timestamp: 'asc' } }),
  countBySession: (sessionId: string, tx?: TxClient) => (tx || prisma).examEvent.count({ where: { sessionId } }),
  findPaginated: (sessionId: string, page: number, limit: number, tx?: TxClient) => {
    const skip = (page - 1) * limit
    return (tx || prisma).examEvent.findMany({ where: { sessionId }, orderBy: { timestamp: 'desc' }, skip, take: limit })
  },
}
