import { prisma } from '../utils/prisma.js'
import { TxClient } from '../utils/transaction.js'

export const analyticsRepository = {
  // SQL aggregation wrappers - use prisma groupBy where possible, fallback to raw for MySQL advanced queries
  getExamStats: async (examId: string, tx?: TxClient) => {
    const db = tx || prisma
    const total = await db.examSession.count({ where: { examId } })
    const submitted = await db.examSession.count({ where: { examId, status: 'SUBMITTED' } })
    const inProgress = await db.examSession.count({ where: { examId, status: 'IN_PROGRESS' } })
    // average score via JS aggregation (deterministic) - could also use SQL AVG via raw query
    return { total, submitted, inProgress }
  },
  getStudentStats: async (studentId: string, tx?: TxClient) => {
    const db = tx || prisma
    const total = await db.examSession.count({ where: { studentId, status: 'SUBMITTED' } })
    const avgScoreAgg = await db.integrityReview.aggregate({ where: { session: { studentId } }, _avg: { score: true } })
    return { total, avgScore: avgScoreAgg._avg.score }
  },
}
