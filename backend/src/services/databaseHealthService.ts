import { prisma } from '../utils/prisma.js'

export type HealthCheck = { check: string; status: 'ok' | 'fail' | 'warn'; count?: number; details?: string }

export async function runIntegrityChecks(): Promise<{ status: string; checks: HealthCheck[]; timestamp: string }> {
  const checks: HealthCheck[] = []

  // 1. Exams with invalid teachers
  const examsInvalidTeacher = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as cnt FROM \`Exam\` e LEFT JOIN \`User\` u ON e.teacherId = u.id WHERE u.id IS NULL`) as any
  const cntInvalidExamTeacher = Number(examsInvalidTeacher[0]?.cnt || 0)
  checks.push({ check: 'Exams with invalid teachers', status: cntInvalidExamTeacher === 0 ? 'ok' : 'fail', count: cntInvalidExamTeacher })

  // 2. Sessions with invalid students
  const sessInvalidStudent = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as cnt FROM \`ExamSession\` s LEFT JOIN \`User\` u ON s.studentId = u.id WHERE u.id IS NULL`) as any
  checks.push({ check: 'Sessions with invalid students', status: Number(sessInvalidStudent[0]?.cnt || 0) === 0 ? 'ok' : 'fail', count: Number(sessInvalidStudent[0]?.cnt || 0) })

  // 3. Sessions with invalid exams
  const sessInvalidExam = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as cnt FROM \`ExamSession\` s LEFT JOIN \`Exam\` e ON s.examId = e.id WHERE e.id IS NULL`) as any
  checks.push({ check: 'Sessions with invalid exams', status: Number(sessInvalidExam[0]?.cnt || 0) === 0 ? 'ok' : 'fail', count: Number(sessInvalidExam[0]?.cnt || 0) })

  // 4. Answers without sessions
  const ansNoSession = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as cnt FROM \`Answer\` a LEFT JOIN \`ExamSession\` s ON a.sessionId = s.id WHERE s.id IS NULL`) as any
  checks.push({ check: 'Answers without sessions', status: Number(ansNoSession[0]?.cnt || 0) === 0 ? 'ok' : 'fail', count: Number(ansNoSession[0]?.cnt || 0) })

  // 5. Answers for questions outside exam (mismatched examId)
  const ansMismatch = await prisma.$queryRawUnsafe(`
    SELECT COUNT(*) as cnt FROM \`Answer\` a
    JOIN \`ExamSession\` s ON a.sessionId = s.id
    JOIN \`Question\` q ON a.questionId = q.id
    WHERE s.examId <> q.examId
  `) as any
  checks.push({ check: 'Answers for questions outside exam', status: Number(ansMismatch[0]?.cnt || 0) === 0 ? 'ok' : 'fail', count: Number(ansMismatch[0]?.cnt || 0) })

  // 6. Reviews without sessions
  const revNoSession = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as cnt FROM \`IntegrityReview\` r LEFT JOIN \`ExamSession\` s ON r.sessionId = s.id WHERE s.id IS NULL`) as any
  checks.push({ check: 'Reviews without sessions', status: Number(revNoSession[0]?.cnt || 0) === 0 ? 'ok' : 'fail', count: Number(revNoSession[0]?.cnt || 0) })

  // 7. Signals without reviews
  const sigNoReview = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as cnt FROM \`IntegritySignal\` sig LEFT JOIN \`IntegrityReview\` r ON sig.integrityReviewId = r.id WHERE r.id IS NULL`) as any
  checks.push({ check: 'Signals without reviews', status: Number(sigNoReview[0]?.cnt || 0) === 0 ? 'ok' : 'fail', count: Number(sigNoReview[0]?.cnt || 0) })

  // 8. Active sessions past deadline
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  const pastDeadline = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as cnt FROM \`ExamSession\` WHERE status='IN_PROGRESS' AND deadlineAt IS NOT NULL AND deadlineAt < ?`, now) as any
  const cntPast = Number(pastDeadline[0]?.cnt || 0)
  checks.push({ check: 'Active sessions past deadline', status: cntPast === 0 ? 'ok' : 'warn', count: cntPast, details: cntPast ? 'Should be expired by background job' : undefined })

  // 9. Duplicate active sessions (same student+exam with IN_PROGRESS)
  const dupActive = await prisma.$queryRawUnsafe(`
    SELECT studentId, examId, COUNT(*) as cnt FROM \`ExamSession\` WHERE status='IN_PROGRESS' GROUP BY studentId, examId HAVING cnt >1
  `) as any
  checks.push({ check: 'Duplicate active sessions', status: dupActive.length === 0 ? 'ok' : 'fail', count: dupActive.length, details: dupActive.length ? JSON.stringify(dupActive.slice(0, 3)) : undefined })

  // 10. Invalid score ranges (0-100)
  const invalidScores = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as cnt FROM \`IntegrityReview\` WHERE score <0 OR score >100`) as any
  checks.push({ check: 'Invalid integrity score ranges', status: Number(invalidScores[0]?.cnt || 0) === 0 ? 'ok' : 'fail', count: Number(invalidScores[0]?.cnt || 0) })

  // 11. Invalid exam date ranges
  const invalidDates = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as cnt FROM \`Exam\` WHERE startAt IS NOT NULL AND endAt IS NOT NULL AND startAt >= endAt`) as any
  checks.push({ check: 'Invalid exam date ranges (start>=end)', status: Number(invalidDates[0]?.cnt || 0) === 0 ? 'ok' : 'fail', count: Number(invalidDates[0]?.cnt || 0) })

  // 12. Invalid question ordering (duplicate order per exam handled via unique, but check null)
  const nullOrders = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as cnt FROM \`Question\` WHERE \`order\` IS NULL OR \`order\` <=0`) as any
  checks.push({ check: 'Invalid question ordering', status: Number(nullOrders[0]?.cnt || 0) === 0 ? 'ok' : 'fail', count: Number(nullOrders[0]?.cnt || 0) })

  // 13. Orphaned audit references (actorId not existing? But actorId nullable, ignore nulls)
  const orphanAudit = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as cnt FROM \`AuditLog\` a LEFT JOIN \`User\` u ON a.actorId = u.id WHERE a.actorId IS NOT NULL AND u.id IS NULL`) as any
  checks.push({ check: 'Orphaned audit actor references', status: Number(orphanAudit[0]?.cnt || 0) === 0 ? 'ok' : 'warn', count: Number(orphanAudit[0]?.cnt || 0) })

  // 14. Duration constraints
  const invalidDuration = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as cnt FROM \`Exam\` WHERE durationMinutes <=0`) as any
  checks.push({ check: 'Invalid exam duration (<=0)', status: Number(invalidDuration[0]?.cnt || 0) === 0 ? 'ok' : 'fail', count: Number(invalidDuration[0]?.cnt || 0) })

  // 15. Negative marks
  const negMarks = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as cnt FROM \`Question\` WHERE points <0`) as any
  checks.push({ check: 'Negative question points', status: Number(negMarks[0]?.cnt || 0) === 0 ? 'ok' : 'fail', count: Number(negMarks[0]?.cnt || 0) })

  const hasFail = checks.some((c) => c.status === 'fail')
  const status = hasFail ? 'unhealthy' : checks.some((c) => c.status === 'warn') ? 'degraded' : 'healthy'

  return { status, checks, timestamp: new Date().toISOString() }
}
