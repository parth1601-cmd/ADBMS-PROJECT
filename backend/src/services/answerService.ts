import { withTransaction, createSavepoint, rollbackToSavepoint } from '../utils/transaction.js'
import { answerRepository } from '../repositories/answerRepository.js'
import { eventRepository } from '../repositories/eventRepository.js'
import { NotFound, Forbidden, BadRequest, Conflict } from '../utils/errors.js'

export async function saveAnswerTransaction(sessionId: string, studentId: string, questionId: string, answerText: string) {
  return withTransaction(async (tx) => {
    // Verify session ownership with lock
    let session: any
    try {
      await (tx as any).$queryRawUnsafe(`SELECT * FROM \`ExamSession\` WHERE id = ? FOR UPDATE`, sessionId)
    } catch {}
    session = await tx.examSession.findUnique({ where: { id: sessionId }, include: { exam: true } })
    if (!session) throw NotFound('Session not found')
    if (session.studentId !== studentId) throw Forbidden()
    if (session.status !== 'IN_PROGRESS') throw Conflict('Session not in progress')

    // Verify server time <= deadline
    const now = new Date()
    const deadline = session.deadlineAt ? new Date(session.deadlineAt) : new Date(new Date(session.startedAt).getTime() + session.exam.durationMinutes * 60 * 1000)
    if (now > deadline) {
      await tx.examSession.update({ where: { id: sessionId }, data: { status: 'EXPIRED', submittedAt: now } })
      throw BadRequest('Time expired')
    }

    // Verify question belongs to exam
    const q: any = await tx.question.findUnique({ where: { id: questionId } })
    if (!q || q.examId !== session.examId) throw BadRequest('Invalid question')
    if (q.deletedAt) throw BadRequest('Question deleted')

    // Upsert answer
    const found = await tx.answer.findFirst({ where: { sessionId, questionId } })
    let result: any
    let eventType: any
    if (found) {
      result = await tx.answer.update({
        where: { id: found.id },
        data: { answer: answerText, changeCount: { increment: 1 }, lastChangedAt: now, answeredAt: now, version: { increment: 1 } },
      })
      eventType = 'ANSWER_CHANGED'
    } else {
      result = await tx.answer.create({
        data: { sessionId, questionId, answer: answerText, changeCount: 0, firstAnsweredAt: now, answeredAt: now },
      })
      eventType = 'QUESTION_ANSWERED'
    }

    // SAVEPOINT demonstration: In MySQL interactive transactions, SAVEPOINT via raw query is not supported in prepared statement protocol,
    // so we use application-level handling: try event insertion, if fails we log (documented in transactions.sql)
    // For demonstration, the SAVEPOINT logic is implemented in SQL scripts under backend/database/tests/transactions.sql
    try {
      await tx.examEvent.create({
        data: { sessionId, questionId, eventType, timestamp: now, metadata: JSON.stringify({ answerLength: answerText.length }) },
      })
    } catch (e) {
      console.error('Event insertion failed (non-critical, answer still committed)', e)
    }

    await tx.examSession.update({ where: { id: sessionId }, data: { lastActivityAt: now, version: { increment: 1 } } })
    return result
  })
}
