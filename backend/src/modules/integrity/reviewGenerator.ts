import { prisma } from "../../utils/prisma.js"
import { extractFeatures } from "./featureExtractor.js"
import { detectSignals } from "./signalDetector.js"
import { scoreSignals } from "./scoringEngine.js"
import { computeSimilarityResults, findBestSimilarity, jaccardSimilarity } from "./similarityEngine.js"
import { analyzeCorrelatedPatterns } from "./patternAnalyzer.js"
import { levelForScore } from "./integrityTypes.js"

export async function generateReviewForSession(sessionId: string) {
  const existing = await prisma.integrityReview.findUnique({ where: { sessionId } })
  if (existing) return existing // idempotent

  return prisma.$transaction(async (tx) => {
    const session = await tx.examSession.findUnique({ where: { id: sessionId }, include: { exam: true } })
    if (!session) throw new Error("Session not found")

    const features = await extractFeatures(sessionId)

    // Cross-student similarity: compare this session's answers with peers in same exam (SUBMITTED only)
    const peersRaw = await tx.examSession.findMany({
      where: { examId: session.examId, status: "SUBMITTED" as any, id: { not: sessionId } },
      include: { student: true }
    })

    let peersForSimilarity: { sessionId: string; studentId: string; studentName: string; answers: { questionId: string; answer: string; type: string; order: number }[] }[] = []
    let bestSimilarity: any = null
    let similarityResults: any[] = []
    if (peersRaw.length > 0) {
      const myAnswers = await tx.answer.findMany({ where: { sessionId }, include: { question: true } })
      // Build peer answers
      for (const peer of peersRaw) {
        const peerAnswersRaw = await tx.answer.findMany({ where: { sessionId: peer.id }, include: { question: true } })
        const orderMap = new Map<string, number>()
        for (const pa of peerAnswersRaw) orderMap.set(pa.questionId, pa.question.order)
        // also need to map my orders
        const peerAnswers = peerAnswersRaw.map(a => ({ questionId: a.questionId, answer: a.answer, type: a.question.type as string, order: a.question.order }))
        peersForSimilarity.push({ sessionId: peer.id, studentId: peer.studentId, studentName: peer.student.name, answers: peerAnswers })
      }

      // For later use, also need my answers with types
      const myAnswersWithType = await tx.answer.findMany({ where: { sessionId }, include: { question: true } })
      const myTyped = myAnswersWithType.map(a => ({ questionId: a.questionId, answer: a.answer, type: a.question.type as string, order: a.question.order }))

      // compute similarity results
      const results = computeSimilarityResults(myTyped, peersForSimilarity)
      bestSimilarity = findBestSimilarity(results)
      similarityResults = results
    }

    // Subjective similarity max
    let subjectiveMax = 0
    let subjectiveCount = 0
    if ((similarityResults as any[]).length) {
      // collect max jaccard among short details
      for (const r of similarityResults) {
        for (const d of r.details) {
          if (d.similarity !== undefined) {
            if (d.similarity > subjectiveMax) subjectiveMax = d.similarity
            if (d.similarity >= 80) subjectiveCount++
          }
        }
      }
    } else if ((similarityResults as any[]).length===0) {
      // fallback direct Jaccard scan if not computed via computeSimilarityResults (when peers empty? but need short direct scan)
      const shortAnswers = await tx.answer.findMany({ where: { sessionId }, include: { question: true } })
      const shortList = shortAnswers.filter(a => a.question.type === "SHORT" && a.answer.length > 20)
      if (shortList.length > 0 && peersRaw.length > 0) {
        for (const sa of shortList) {
          for (const peer of peersRaw) {
            const peerAns = await tx.answer.findFirst({ where: { sessionId: peer.id, questionId: sa.questionId } })
            if (peerAns && peerAns.answer.length > 20) {
              const sim = jaccardSimilarity(sa.answer, peerAns.answer)
              if (sim > subjectiveMax) subjectiveMax = sim
              if (sim >= 80) subjectiveCount++
            }
          }
        }
      }
    }

    // Multi-session detection: overlapping active sessions or historical sessions
    const overlapping = await tx.examSession.findMany({ where: { studentId: session.studentId, examId: session.examId, id: { not: sessionId } } })
    const multiSession = overlapping.length > 1 || (overlapping.length === 1 && features.reconnectCount >= 1)

    // Correlated patterns
    const correlations = analyzeCorrelatedPatterns(features)
    const bestCorrelation = correlations[0] // most count

    // Prepare opts for signal detection
    const signals = detectSignals(features, {
      similarityPercent: bestSimilarity?.similarityPercent,
      similarityDetails: bestSimilarity ? { matches: bestSimilarity.matches, total: bestSimilarity.total, peerName: bestSimilarity.peerName } : undefined,
      subjectiveSimilarity: subjectiveCount > 0 ? { max: subjectiveMax, count: subjectiveCount } : undefined,
      multiSession,
      correlatedPatterns: bestCorrelation ? { count: bestCorrelation.events.length, windowSec: bestCorrelation.windowSec } : undefined,
    })

    // If multiple correlations, add additional ones beyond best? detect already adds one, but ensure we capture others if needed

    const { capped, level } = scoreSignals(signals)

    const review = await tx.integrityReview.create({
      data: {
        sessionId,
        score: capped,
        level: level as any,
        status: "PENDING" as any,
        generatedAt: new Date(),
      }
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
        }
      })
    }

    // create notification for teacher
    const teacherId = session.exam.teacherId
    const student = await tx.user.findUnique({ where: { id: session.studentId } })
    await tx.notification.create({
      data: {
        userId: teacherId,
        title: `Integrity review generated — ${student?.name}`,
        message: `Score ${capped} · ${level.replace(/_/g, " ")} · ${session.exam.title}`,
        type: "REVIEW_CREATED",
        entityId: review.id,
      }
    })

    // audit log
    await tx.auditLog.create({
      data: {
        actorId: session.studentId,
        actorRole: "STUDENT",
        action: "EXAM_SUBMITTED" as any,
        entityType: "IntegrityReview",
        entityId: review.id,
        metadata: JSON.stringify({ sessionId, score: capped, level }),
      }
    })

    return review
  })
}
