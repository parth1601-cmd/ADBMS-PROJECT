import { withTransaction, createSavepoint, rollbackToSavepoint } from '../utils/transaction.js'
import { examRepository } from '../repositories/examRepository.js'
import { auditRepository } from '../repositories/auditRepository.js'
import { NotFound, Forbidden, BadRequest, Conflict } from '../utils/errors.js'

type PublishValidation = {
  hasQuestions: boolean
  totalMarks: number
  passingMarks: number
  startBeforeEnd: boolean
  durationValid: boolean
}

export async function validateExamForPublish(examId: string): Promise<PublishValidation> {
  const exam: any = await examRepository.findById(examId)
  if (!exam) throw new Error('Exam not found')
  const qCount = await examRepository.countQuestions(examId)
  const hasQuestions = qCount > 0
  const totalMarks = exam.totalMarks || 0
  const passingMarks = exam.passingMarks || 0
  const startBeforeEnd = !exam.startAt || !exam.endAt || new Date(exam.startAt) < new Date(exam.endAt)
  const durationValid = exam.durationMinutes > 0 && exam.durationMinutes <= 300
  return { hasQuestions, totalMarks, passingMarks, startBeforeEnd, durationValid }
}

export async function publishExamTransaction(examId: string, teacherId: string, ip?: string) {
  return withTransaction(async (tx) => {
    const exam: any = await examRepository.findByIdForUpdate(examId, tx)
    if (!exam) throw NotFound('Exam not found')
    if (exam.teacherId !== teacherId) throw Forbidden()
    // Validate
    const val = await validateExamForPublish(examId)
    // Use tx for counts to stay consistent
    const txQCount = await (tx as any).question.count({ where: { examId } })
    if (txQCount === 0) throw BadRequest('Add questions before publishing')
    if (exam.totalMarks !== undefined && exam.passingMarks !== undefined && exam.passingMarks > exam.totalMarks && exam.totalMarks > 0) {
      throw BadRequest('passingMarks cannot exceed totalMarks')
    }
    if (exam.durationMinutes <= 0) throw BadRequest('Invalid duration')
    if (exam.startAt && exam.endAt && new Date(exam.startAt) >= new Date(exam.endAt)) {
      throw BadRequest('startAt must be before endAt')
    }

    // Lock and update
    const updated = await tx.exam.update({
      where: { id: examId },
      data: { status: 'PUBLISHED' as any, publishedAt: new Date(), version: { increment: 1 } },
    })

    // Audit in same transaction (atomic with publish)
    await auditRepository.create(
      {
        actorId: teacherId,
        actorRole: 'TEACHER',
        action: 'EXAM_PUBLISHED',
        entityType: 'Exam',
        entityId: updated.id,
        metadata: JSON.stringify({ status: updated.status, qCount: txQCount }),
        ipAddress: ip || null,
      },
      tx
    )
    // Notifications: create for up to 50 students (transactional)
    try {
      const students: any = await tx.user.findMany({ where: { role: 'STUDENT' }, select: { id: true }, take: 50 })
      const teacher: any = await tx.user.findUnique({ where: { id: teacherId } })
      const message = `${updated.title} has been published by ${teacher?.name || 'Teacher'}.`
      for (const s of students) {
        await tx.notification.create({ data: { userId: s.id, title: 'New Test Available', message, type: 'TEST_PUBLISHED', entityId: updated.id } })
      }
    } catch (e) {
      // If notification fails, savepoint rollback only notifications, not publish? But spec says audit + publish atomic. Notifications may be async.
      // We choose to keep notifications non-critical; log but don't rollback publish.
      console.error('Notification creation failed during publish', e)
    }
    return updated
  })
}

export async function unpublishExamTransaction(examId: string, teacherId: string, ip?: string) {
  return withTransaction(async (tx) => {
    const exam: any = await examRepository.findByIdForUpdate(examId, tx)
    if (!exam) throw NotFound('Exam not found')
    if (exam.teacherId !== teacherId) throw Forbidden()
    const hasActive = await examRepository.hasActiveSessions(examId, tx)
    if (hasActive) {
      throw Conflict('Cannot unpublish: active sessions exist')
    }
    const updated = await tx.exam.update({
      where: { id: examId },
      data: { status: 'UNPUBLISHED' as any, version: { increment: 1 } },
    })
    await auditRepository.create(
      {
        actorId: teacherId,
        actorRole: 'TEACHER',
        action: 'EXAM_UNPUBLISHED',
        entityType: 'Exam',
        entityId: updated.id,
        metadata: JSON.stringify({ status: updated.status }),
        ipAddress: ip || null,
      },
      tx
    )
    return updated
  })
}

// Status machine validation
export const validExamTransitions: Record<string, string[]> = {
  DRAFT: ['PUBLISHED', 'SCHEDULED', 'LIVE', 'ARCHIVED'],
  PUBLISHED: ['UNPUBLISHED', 'ARCHIVED', 'LIVE', 'SCHEDULED', 'COMPLETED'],
  UNPUBLISHED: ['PUBLISHED', 'ARCHIVED', 'DRAFT'],
  ARCHIVED: [],
  SCHEDULED: ['LIVE', 'PUBLISHED', 'UNPUBLISHED', 'COMPLETED'],
  LIVE: ['COMPLETED', 'UNPUBLISHED', 'ARCHIVED', 'PUBLISHED'],
  COMPLETED: ['ARCHIVED'],
}
export function canTransitionExam(from: string, to: string): boolean {
  const allowed = validExamTransitions[from] || []
  return allowed.includes(to) || from === to
}
