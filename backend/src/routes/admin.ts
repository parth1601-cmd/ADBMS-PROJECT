import { Router } from 'express'
import { authRequired, requireRole } from '../middleware/auth.js'
import { prisma } from '../utils/prisma.js'
import { runIntegrityChecks } from '../services/databaseHealthService.js'

const r = Router()

r.use(authRequired)

// Health check - admin only
r.get('/database/health', requireRole('TEACHER','ADMIN'), async (req, res, next) => {
  try {
    // In real prod, ADMIN only; here allow TEACHER as admin per spec
    const result = await runIntegrityChecks()
    // Never expose credentials; just status
    res.json(result)
  } catch (e) { next(e) }
})

r.get('/database/stats', requireRole('TEACHER','ADMIN'), async (req, res, next) => {
  try {
    const [users, exams, sessions, questions, reviews, signals, audits] = await Promise.all([
      prisma.user.count(),
      prisma.exam.count(),
      prisma.examSession.count(),
      prisma.question.count(),
      prisma.integrityReview.count(),
      prisma.integritySignal.count(),
      prisma.auditLog.count(),
    ])
    res.json({ users, exams, sessions, questions, reviews, signals, audits, timestamp: new Date().toISOString() })
  } catch (e) { next(e) }
})

export default r
