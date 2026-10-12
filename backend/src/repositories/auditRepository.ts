import { prisma } from '../utils/prisma.js'
import { TxClient } from '../utils/transaction.js'

export const auditRepository = {
  create: (data: any, tx?: TxClient) => (tx || prisma).auditLog.create({ data }),
  findMany: (where: any, opts: any, tx?: TxClient) => (tx || prisma).auditLog.findMany({ where, ...opts }),
  count: (where: any, tx?: TxClient) => (tx || prisma).auditLog.count({ where }),
}
