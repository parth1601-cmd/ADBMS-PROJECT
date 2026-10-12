import { prisma } from '../utils/prisma.js'
import { extractFeatures } from '../modules/integrity/featureExtractor.js'
import { detectSignals } from '../modules/integrity/signalDetector.js'
import { scoreSignals } from '../modules/integrity/scoringEngine.js'
import { computeSimilarityResults } from '../modules/integrity/similarityEngine.js'
import { analyzeCorrelatedPatterns } from '../modules/integrity/patternAnalyzer.js'

export async function generateReviewWithTx(sessionId: string, tx: any) {
  const existing = await tx.integrityReview.findUnique({ where: { sessionId } })
  if (existing) return existing

  const session = await tx.examSession.findUnique({ where: { id: sessionId }, include: { exam: true } })
  if (!session) throw new Error('Session not found')

  // Extract features (uses prisma globally, but we pass sessionId; to stay transactional we use tx where possible)
  // For simplicity, use same extractFeatures which queries via prisma client – but we replicate within tx by fetching manually
  const features = await extractFeatures(sessionId)

  // Similarity etc - use tx
  const peersRaw = await tx.examSession.findMany({
    where: { examId: session.examId, status: 'SUBMITTED', id: { not: sessionId } },
    include: { student: true },
  })

  let bestSimilarity: any = null
  let similarityResults: any[] = []
  if (peersRaw.length > 0) {
    const myAnswers = await tx.answer.findMany({ where: { sessionId }, include: { question: true } })
    const myTyped = myAnswers.map((a: any) => ({ questionId: a.questionId, answer: a.answer, type: a.question.type, order: a.question.order }))
    const peersForSimilarity: any[] = []
    for (const peer of peersRaw) {
      const peerAnswersRaw = await tx.answer.findMany({ where: { sessionId: peer.id }, include: { question: true } })
      const peerAnswers = peerAnswersRaw.map((a: any) => ({ questionId: a.questionId, answer: a.answer, type: a.question.type, order: a.question.order }))
      peersForSimilarity.push({ sessionId: peer.id, studentId: peer.studentId, studentName: peer.student.name, answers: peerAnswers })
    }
    similarityResults = computeSimilarityResults(myTyped, peersForSimilarity)
    bestSimilarity = similarityResults[0] || null
  }

  const overlapping = await tx.examSession.findMany({ where: { studentId: session.studentId, examId: session.examId, id: { not: sessionId } } })
  const multiSession = overlapping.length > 1 || (overlapping.length === 1 && (features as any).reconnectCount >= 1)

  const correlations = analyzeCorrelatedPatterns(features as any)
  const bestCorrelation = correlations[0]

  const signals = detectSignals(features as any, {
    similarityPercent: bestSimilarity?.similarityPercent,
    similarityDetails: bestSimilarity ? { matches: bestSimilarity.matches, total: bestSimilarity.total, peerName: bestSimilarity.peerName } : undefined,
    subjectiveSimilarity: (() => {
      let max = 0,
        count = 0
      for (const r of similarityResults) for (const d of r.details) if (d.similarity >= 80) count++
      return count > 0 ? { max, count } : undefined
    })(),
    multiSession,
    correlatedPatterns: bestCorrelation ? { count: bestCorrelation.events.length, windowSec: bestCorrelation.windowSec } : undefined,
  })

  const { capped, level } = scoreSignals(signals)

  const review = await tx.integrityReview.create({
    data: {
      sessionId,
      score: capped,
      level: level as any,
      status: 'PENDING' as any,
      generatedAt: new Date(),
      studentId: session.studentId,
      examId: session.examId,
    },
  })

  for (const sig of signals) {
    await tx.integritySignal.create({
      data: {
        integrityReviewId: review.id,
        type: sig.type as any,
        severity: sig.severity as any,
        points: sig.points,
        confidence: sig.confidence,
        description: sig.description,
        evidence: JSON.stringify(sig.evidence),
      },
    })
  }

  const teacherId = session.exam.teacherId
  const student = await tx.user.findUnique({ where: { id: session.studentId } })
  await tx.notification.create({
    data: {
      userId: teacherId,
      title: `Integrity review generated — ${student?.name}`,
      message: `Score ${capped} · ${level.replace(/_/g, ' ')} · ${session.exam.title}`,
      type: 'REVIEW_CREATED',
      entityId: review.id,
    },
  })
  await tx.auditLog.create({
    data: {
      actorId: session.studentId,
      actorRole: 'STUDENT',
      action: 'EXAM_SUBMITTED',
      entityType: 'IntegrityReview',
      entityId: review.id,
      metadata: JSON.stringify({ sessionId, score: capped, level }),
    },
  })

  return review
}
