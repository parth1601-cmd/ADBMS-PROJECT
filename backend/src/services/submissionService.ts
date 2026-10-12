import { withTransaction } from '../utils/transaction.js'
import { prisma } from '../utils/prisma.js'
import { calculateScore } from './scoringService.js'
import { generateReviewForSession } from '../modules/integrity/reviewGenerator.js'
import { NotFound, Forbidden, BadRequest, Conflict } from '../utils/errors.js'

export async function submitExamTransaction(sessionId: string, studentId: string) {
  return withTransaction(
    async (tx) => {
      // Lock session
      try {
        await (tx as any).$queryRawUnsafe(`SELECT * FROM \`ExamSession\` WHERE id = ? FOR UPDATE`, sessionId)
      } catch {}
      const session: any = await tx.examSession.findUnique({ where: { id: sessionId }, include: { exam: true } })
      if (!session) throw NotFound('Session not found')
      if (session.studentId !== studentId) throw Forbidden()

      // Idempotent check
      if (session.status === 'SUBMITTED') {
        // Return existing result without duplication
        const existingReview = await tx.integrityReview.findUnique({ where: { sessionId } })
        const score = await calculateScore(sessionId, { tx: tx as any })
        return { session, review: existingReview, result: score, alreadySubmitted: true }
      }
      if (session.status === 'EXPIRED') throw BadRequest('Session expired')
      if (session.status !== 'IN_PROGRESS') throw Conflict('Invalid session status')

      // Validate deadline (server time authoritative)
      const now = new Date()
      // allow grace window of 5 seconds? but spec says server determines expiration, detect expiration first
      const deadline = session.deadlineAt ? new Date(session.deadlineAt) : new Date(new Date(session.startedAt).getTime() + session.exam.durationMinutes * 60 * 1000)
      // If past deadline, still allow submission but mark appropriately? Spec says auto-submission logic; we treat as expired -> submitted if within same transaction?
      // For strictness, if expired we mark EXPIRED then fail. But better to allow if client submitted just after deadline via server grace? We'll allow submission up to 30s after deadline, otherwise mark expired.
      const graceMs = 30 * 1000
      if (now.getTime() > deadline.getTime() + graceMs) {
        await tx.examSession.update({ where: { id: sessionId }, data: { status: 'EXPIRED', submittedAt: now } })
        await tx.examEvent.create({ data: { sessionId, eventType: 'SESSION_ENDED', timestamp: now, metadata: JSON.stringify({ reason: 'deadline_exceeded' }) } })
        throw BadRequest('Time expired, session auto-expired')
      }

      // Load answers, calculate objective marks via scoringService
      const scoreResult = await calculateScore(sessionId, { tx: tx as any })

      // Update session to SUBMITTED (version increment for optimistic concurrency)
      const updated = await tx.examSession.update({
        where: { id: sessionId },
        data: { status: 'SUBMITTED', submittedAt: now, lastActivityAt: now, version: { increment: 1 } },
      })

      // Insert SESSION_ENDED event
      await tx.examEvent.create({ data: { sessionId, eventType: 'SESSION_ENDED', timestamp: now } })

      // Run integrity analysis and create review + signals (within same transaction for atomicity)
      // generateReviewForSession already uses its own transaction; to keep atomic, we inline similar logic but call with tx context.
      // For now, call generateReviewForSession which will idempotently handle duplicate via existing check.
      // Since we are already in tx, we need to avoid nested transaction deadlock; instead manually create review if not exists using tx.
      let review = await tx.integrityReview.findUnique({ where: { sessionId } })
      if (!review) {
        // Use same generation logic but via tx - call helper that accepts tx
        // For simplicity, use prisma's generate but with tx client override: we duplicate minimal generation
        const { generateReviewWithTx } = await import('./integrityService.js')
        review = await generateReviewWithTx(sessionId, tx as any)
      }

      // Create audit log atomically
      await tx.auditLog.create({
        data: {
          actorId: studentId,
          actorRole: 'STUDENT',
          action: 'EXAM_SUBMITTED',
          entityType: 'ExamSession',
          entityId: sessionId,
          metadata: JSON.stringify({ obtained: scoreResult.obtained, percentage: scoreResult.percentage, reviewId: review?.id }),
        },
      })

      // Create notification for teacher (non-critical)
      try {
        const teacherId = session.exam.teacherId
        const student = await tx.user.findUnique({ where: { id: studentId } })
        await tx.notification.create({
          data: {
            userId: teacherId,
            title: `Exam submitted — ${student?.name || studentId}`,
            message: `${session.exam.title} submitted, integrity review generated (${review?.score ?? 'pending'})`,
            type: 'REVIEW_CREATED',
            entityId: review?.id || sessionId,
          },
        })
      } catch {}

      return { session: updated, review, result: scoreResult, alreadySubmitted: false }
    },
    { isolationLevel: 'Serializable', maxRetries: 4 }
  )
}
