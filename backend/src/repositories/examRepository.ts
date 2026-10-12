import { prisma } from '../utils/prisma.js'
import { TxClient } from '../utils/transaction.js'

export const examRepository = {
  findById: (id: string, tx?: TxClient) => (tx || prisma).exam.findUnique({ where: { id } }),
  findByIdForUpdate: async (id: string, tx: TxClient) => {
    try {
      await (tx as any).$queryRawUnsafe(`SELECT * FROM \`Exam\` WHERE id = ? FOR UPDATE`, id)
    } catch {}
    return tx.exam.findUnique({ where: { id } })
  },
  findByTeacher: (teacherId: string, tx?: TxClient) => (tx || prisma).exam.findMany({ where: { teacherId } }),
  create: (data: any, tx?: TxClient) => (tx || prisma).exam.create({ data }),
  update: (id: string, data: any, tx?: TxClient) => (tx || prisma).exam.update({ where: { id }, data }),
  delete: (id: string, tx?: TxClient) => (tx || prisma).exam.delete({ where: { id } }),
  countQuestions: (examId: string, tx?: TxClient) => (tx || prisma).question.count({ where: { examId, deletedAt: null } }),
  hasActiveSessions: async (examId: string, tx?: TxClient) => {
    const count = await (tx || prisma).examSession.count({ where: { examId, status: 'IN_PROGRESS' } })
    return count > 0
  },
}
