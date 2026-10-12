import { prisma } from '../utils/prisma.js'
import { TxClient } from '../utils/transaction.js'

export const reviewRepository = {
  findById: (id: string, tx?: TxClient) =>
    (tx || prisma).integrityReview.findUnique({ where: { id }, include: { session: { include: { student: true, exam: true } }, signals: true, notes: { include: { teacher: true } } } }),
  findBySession: (sessionId: string, tx?: TxClient) =>
    (tx || prisma).integrityReview.findUnique({ where: { sessionId }, include: { signals: true } }),
  create: (data: any, tx?: TxClient) => (tx || prisma).integrityReview.create({ data }),
  update: (id: string, data: any, tx?: TxClient) => (tx || prisma).integrityReview.update({ where: { id }, data }),
  lockForUpdate: async (id: string, tx: TxClient) => {
    try {
      await (tx as any).$queryRawUnsafe(`SELECT * FROM \`IntegrityReview\` WHERE id = ? FOR UPDATE`, id)
    } catch {}
    return tx.integrityReview.findUnique({ where: { id } })
  },
  listByExamIds: (examIds: string[], where: any, opts: any, tx?: TxClient) =>
    (tx || prisma).integrityReview.findMany({ ...opts, where: { ...where, session: { examId: { in: examIds } } } }),
  countByExamIds: (examIds: string[], where: any, tx?: TxClient) =>
    (tx || prisma).integrityReview.count({ where: { ...where, session: { examId: { in: examIds } } } }),
}
