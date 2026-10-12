import { withTransaction, createSavepoint, rollbackToSavepoint } from '../utils/transaction.js'
import { prisma } from '../utils/prisma.js'
import { sessionRepository } from '../repositories/sessionRepository.js'
import { examRepository } from '../repositories/examRepository.js'
import { auditRepository } from '../repositories/auditRepository.js'
import { NotFound, BadRequest, Forbidden, Conflict } from '../utils/errors.js'

function deadlineFromNow(durationMinutes: number): Date {
  return new Date(Date.now() + durationMinutes * 60 * 1000)
}

export async function startExamTransaction(examId: string, studentId: string) {
  return withTransaction(
    async (tx) => {
      // 1. Lock/check exam
      const exam: any = await examRepository.findByIdForUpdate(examId, tx)
      if (!exam) throw NotFound('Exam not found')

      // 2. Verify exam is PUBLISHED/LIVE
      const allowedStatuses = ['LIVE', 'PUBLISHED', 'SCHEDULED']
      if (!allowedStatuses.includes(exam.status)) throw BadRequest('Exam not available')

      // 3. Verify time window using server time
      const now = new Date()
      if (exam.startAt && now < new Date(exam.startAt)) throw BadRequest('Exam has not started yet')
      if (exam.endAt && now > new Date(exam.endAt)) throw BadRequest('Exam window has closed')

      // 4. Check for existing active session with FOR UPDATE lock equivalent
      // For MySQL concurrency: SELECT ... FOR UPDATE on session row
      const existing: any = await tx.examSession.findFirst({ where: { examId, studentId, status: 'IN_PROGRESS' } })
      if (existing) {
        // Check deadline: if expired, mark expired and continue to create new if attempts allow
        if (existing.deadlineAt && now > new Date(existing.deadlineAt)) {
          await tx.examSession.update({ where: { id: existing.id }, data: { status: 'EXPIRED', submittedAt: now } })
          await tx.examEvent.create({ data: { sessionId: existing.id, eventType: 'SESSION_ENDED', timestamp: now, metadata: JSON.stringify({ reason: 'expired' }) } })
          // proceed to creation below
        } else {
          // Dedicated unique constraint prevents duplicate; return existing
          return { session: existing, isNew: false }
        }
      }

      // 5. Check attemptsAllowed
      const count = await tx.examSession.count({ where: { examId, studentId, status: { in: ['SUBMITTED', 'EXPIRED', 'IN_PROGRESS'] as any } } })
      if (count >= exam.attemptsAllowed) throw Conflict('Attempts exhausted')

      // 6. Eligibility check (if ExamEligibility records exist, student must belong to allowed class/section)
      const eligibilities = await tx.examEligibility.findMany({ where: { examId } })
      if (eligibilities.length > 0) {
        const student: any = await tx.user.findUnique({ where: { id: studentId } })
        const match = eligibilities.some((e: any) => e.className === student.className && (e.section === null || e.section === student.section))
        // If mismatch and className defined on student, reject. If student has no class info, allow (backward compat)
        if (student.className && !match) throw Forbidden('Not eligible for this exam (class/section)')
      }

      // 7. Create session with server-calculated deadline
      const deadlineAt = deadlineFromNow(exam.durationMinutes)
      const session = await tx.examSession.create({
        data: { examId, studentId, status: 'IN_PROGRESS', startedAt: now, deadlineAt, lastActivityAt: now },
      })

      // 8. Insert SESSION_STARTED event atomically
      await tx.examEvent.create({ data: { sessionId: session.id, eventType: 'SESSION_STARTED', timestamp: now } })

      // 9. Audit
      await auditRepository.create(
        {
          actorId: studentId,
          actorRole: 'STUDENT',
          action: 'EXAM_STARTED',
          entityType: 'ExamSession',
          entityId: session.id,
          metadata: JSON.stringify({ examId, deadlineAt }),
        },
        tx
      )

      return { session, isNew: true }
    },
    { isolationLevel: 'RepeatableRead' }
  )
}

export async function checkAndHandleExpiration(sessionId: string, txOrPrisma?: any): Promise<{ expired: boolean; session: any }> {
  const db = txOrPrisma || prisma
  const session: any = await db.examSession.findUnique({ where: { id: sessionId }, include: { exam: true } })
  if (!session) throw NotFound('Session not found')
  if (session.status !== 'IN_PROGRESS') return { expired: false, session }
  const now = new Date()
  const deadline = session.deadlineAt ? new Date(session.deadlineAt) : new Date(new Date(session.startedAt).getTime() + session.exam.durationMinutes * 60 * 1000)
  const remainingSec = Math.floor((deadline.getTime() - now.getTime()) / 1000)
  const expired = remainingSec <= 0
  if (expired) {
    const updated: any = await db.examSession.update({ where: { id: sessionId }, data: { status: 'EXPIRED', submittedAt: now } })
    try {
      await db.examEvent.create({ data: { sessionId, eventType: 'SESSION_ENDED', timestamp: now, metadata: JSON.stringify({ reason: 'auto-expire' }) } })
    } catch {}
    return { expired: true, session: updated }
  }
  return { expired: false, session }
}
