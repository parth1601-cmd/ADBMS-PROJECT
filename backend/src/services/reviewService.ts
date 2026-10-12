import { withTransaction } from '../utils/transaction.js'
import { reviewRepository } from '../repositories/reviewRepository.js'
import { auditRepository } from '../repositories/auditRepository.js'
import { NotFound, Forbidden, BadRequest, Conflict } from '../utils/errors.js'

const validTransitions: Record<string, string[]> = {
  PENDING: ['IN_REVIEW', 'DISMISSED', 'REVIEWED'],
  IN_REVIEW: ['REVIEWED', 'REQUIRES_FOLLOW_UP', 'DISMISSED', 'PENDING'],
  REQUIRES_FOLLOW_UP: ['REVIEWED', 'IN_REVIEW', 'DISMISSED'],
  REVIEWED: ['REQUIRES_FOLLOW_UP', 'DISMISSED'],
  DISMISSED: ['PENDING', 'IN_REVIEW'],
}

export function canTransitionReview(from: string, to: string): boolean {
  const allowed = validTransitions[from] || []
  return allowed.includes(to)
}

export async function changeReviewStatusTransaction(reviewId: string, teacherId: string, teacherRole: string, newStatus: string, note?: string, ip?: string, expectedVersion?: number) {
  return withTransaction(async (tx) => {
    const review: any = await reviewRepository.lockForUpdate(reviewId, tx)
    if (!review) throw NotFound('Review not found')
    // Verify exam ownership via session exam
    const full: any = await tx.integrityReview.findUnique({ where: { id: reviewId }, include: { session: { include: { exam: true } } } })
    if (!full) throw NotFound('Review not found')
    if (full.session.exam.teacherId !== teacherId && teacherRole !== 'ADMIN') throw Forbidden()

    // Optimistic concurrency: if expectedVersion provided, check
    if (expectedVersion !== undefined && review.version !== expectedVersion) {
      throw Conflict('Conflict: review was modified by another teacher')
    }

    const fromStat = review.status
    if (!canTransitionReview(fromStat, newStatus)) {
      throw BadRequest(`Invalid status transition ${fromStat} -> ${newStatus}`)
    }

    const updated = await tx.integrityReview.update({
      where: { id: reviewId },
      data: {
        status: newStatus as any,
        reviewedAt: newStatus === 'REVIEWED' ? new Date() : review.reviewedAt,
        reviewedBy: newStatus === 'REVIEWED' ? teacherId : review.reviewedBy,
        version: { increment: 1 },
      },
    })

    await auditRepository.create(
      {
        actorId: teacherId,
        actorRole: teacherRole,
        action: 'REVIEW_STATUS_CHANGED',
        entityType: 'IntegrityReview',
        entityId: reviewId,
        metadata: JSON.stringify({ from: fromStat, to: newStatus }),
        ipAddress: ip || null,
      },
      tx
    )

    if (note) {
      await tx.reviewNote.create({ data: { integrityReviewId: reviewId, teacherId, note } })
      await auditRepository.create(
        {
          actorId: teacherId,
          actorRole: teacherRole,
          action: 'REVIEW_NOTE_ADDED',
          entityType: 'IntegrityReview',
          entityId: reviewId,
          metadata: JSON.stringify({ viaStatusChange: true }),
          ipAddress: ip || null,
        },
        tx
      )
    }

    // Notification for student if appropriate
    if (newStatus === 'REVIEWED' || newStatus === 'REQUIRES_FOLLOW_UP') {
      try {
        const statusDisplay = newStatus.replace(/_/g, ' ')
        await tx.notification.create({
          data: {
            userId: full.session.studentId,
            title: 'Integrity review updated',
            message: `Your review status changed to ${statusDisplay}`,
            type: 'REVIEW_STATUS_CHANGED',
            entityId: reviewId,
          },
        })
      } catch {}
    }

    return updated
  })
}

export async function assignReviewTransaction(reviewId: string, teacherId: string, teacherRole: string, assigneeId: string, ip?: string) {
  return withTransaction(async (tx) => {
    const review: any = await reviewRepository.lockForUpdate(reviewId, tx)
    if (!review) throw NotFound('Review not found')
    const full: any = await tx.integrityReview.findUnique({ where: { id: reviewId }, include: { session: { include: { exam: true } } } })
    if (full.session.exam.teacherId !== teacherId && teacherRole !== 'ADMIN') throw Forbidden()
    const assignee: any = await tx.user.findUnique({ where: { id: assigneeId } })
    if (!assignee || assignee.role !== 'TEACHER') throw BadRequest('Invalid assignee')

    const updated = await tx.integrityReview.update({
      where: { id: reviewId },
      data: { assignedReviewerId: assigneeId, assignedAt: new Date(), version: { increment: 1 } },
    })
    await auditRepository.create(
      {
        actorId: teacherId,
        actorRole: teacherRole,
        action: 'REVIEW_ASSIGNED',
        entityType: 'IntegrityReview',
        entityId: reviewId,
        metadata: JSON.stringify({ assignedTo: assigneeId }),
        ipAddress: ip || null,
      },
      tx
    )
    try {
      await tx.notification.create({
        data: { userId: assigneeId, title: 'Review assigned to you', message: `Review ${reviewId.slice(0, 8)} assigned by ${teacherId}`, type: 'REVIEW_ASSIGNED', entityId: reviewId },
      })
    } catch {}
    return updated
  })
}
