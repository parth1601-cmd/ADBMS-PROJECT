import { prisma } from '../utils/prisma.js'
import { TxClient } from '../utils/transaction.js'

export const answerRepository = {
  findBySessionAndQuestion: (sessionId: string, questionId: string, tx?: TxClient) =>
    (tx || prisma).answer.findFirst({ where: { sessionId, questionId } }),
  findBySession: (sessionId: string, tx?: TxClient) => (tx || prisma).answer.findMany({ where: { sessionId } }),
  upsert: async (sessionId: string, questionId: string, answerText: string, tx: TxClient) => {
    const found = await tx.answer.findFirst({ where: { sessionId, questionId } })
    if (found) {
      return tx.answer.update({
        where: { id: found.id },
        data: { answer: answerText, changeCount: { increment: 1 }, lastChangedAt: new Date(), answeredAt: new Date() },
      })
    } else {
      return tx.answer.create({
        data: { sessionId, questionId, answer: answerText, changeCount: 0, firstAnsweredAt: new Date(), answeredAt: new Date() },
      })
    }
  },
  countBySession: (sessionId: string, tx?: TxClient) => (tx || prisma).answer.count({ where: { sessionId } }),
}
