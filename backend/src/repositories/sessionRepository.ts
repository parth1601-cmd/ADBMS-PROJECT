import { prisma } from '../utils/prisma.js'
import { TxClient } from '../utils/transaction.js'

export const sessionRepository = {
  findById: (id: string, tx?: TxClient) => (tx || prisma).examSession.findUnique({ where: { id }, include: { exam: true } }),
  findActive: (examId: string, studentId: string, tx?: TxClient) =>
    (tx || prisma).examSession.findFirst({ where: { examId, studentId, status: 'IN_PROGRESS' } }),
  findByExamAndStudent: (examId: string, studentId: string, tx?: TxClient) =>
    (tx || prisma).examSession.findMany({ where: { examId, studentId }, orderBy: { startedAt: 'desc' } }),
  countByExamAndStudent: (examId: string, studentId: string, tx?: TxClient) =>
    (tx || prisma).examSession.count({ where: { examId, studentId, status: { in: ['SUBMITTED', 'EXPIRED', 'IN_PROGRESS'] as any } } }),
  create: (data: any, tx?: TxClient) => (tx || prisma).examSession.create({ data }),
  update: (id: string, data: any, tx?: TxClient) => (tx || prisma).examSession.update({ where: { id }, data }),
  lockForUpdate: async (id: string, tx: TxClient) => {
    try {
      await (tx as any).$queryRawUnsafe(`SELECT * FROM \`ExamSession\` WHERE id = ? FOR UPDATE`, id)
    } catch {}
    return tx.examSession.findUnique({ where: { id }, include: { exam: true } })
  },
  findExpiredActive: (now: Date, tx?: TxClient) =>
    (tx || prisma).examSession.findMany({ where: { status: 'IN_PROGRESS', deadlineAt: { lt: now } } }),
}
