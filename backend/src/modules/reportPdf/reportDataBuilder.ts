// @ts-nocheck
import { prisma } from "../../utils/prisma.js"
import { brand } from "../../brand/branding.js"
import { ReportData } from "./reportTypes.js"
import { generateDeterministicReportId, ensurePersistentReport } from "./reportService.js"

function levelDisplay(level: string) {
  if (level === "HIGH_PRIORITY_REVIEW") return "High Priority Review"
  if (level === "REQUIRES_REVIEW") return "Requires Review"
  if (level === "LOW_CONCERN") return "Low Concern"
  return "Normal"
}
function statusDisplay(s: string) {
  if (s === "PENDING") return "Requires Teacher Review"
  if (s === "IN_REVIEW") return "In Review"
  if (s === "REQUIRES_FOLLOW_UP") return "Requires Follow-Up"
  if (s === "REVIEWED") return "Reviewed"
  if (s === "DISMISSED") return "Dismissed"
  return s
}

function sanitize(s: any, fallback = "—"): string {
  if (s === undefined || s === null) return fallback
  const t = String(s).trim()
  if (!t) return fallback
  return t
}

function computeResultLike(questions: any[], answers: any[]) {
  const answerMap = new Map(answers.map(a => [a.questionId, a]))
  let correct = 0, incorrect = 0, unanswered = 0, obtained = 0, totalMarks = 0
  const perQuestion: any[] = []
  for (const q of questions) {
    totalMarks += q.points
    const aRec = answerMap.get(q.id)
    const ans = aRec ? aRec.answer : null
    const isEmpty = ans === undefined || ans === null || String(ans).trim() === ""
    if (isEmpty) {
      // subjective or unanswered — determine if subjective, treat separately
      if (q.type === "SHORT" || q.type === "SHORT_ANSWER" || q.type === "LONG_ANSWER") {
        // Check if there was an answer record but empty => truly unanswered? We'll treat empty as unanswered for now
        unanswered++
        perQuestion.push({ q, ans: null, isCorrect: null, marks: null, unanswered: true, subjective: true, aRec })
      } else {
        unanswered++
        perQuestion.push({ q, ans: null, isCorrect: false, marks: 0, unanswered: true, subjective: false, aRec })
      }
    } else {
      if (q.type === "MCQ" || q.type === "TF" || q.type === "TRUE_FALSE") {
        const isCorrect = String(ans).trim().toLowerCase() === String(q.correctAnswer).trim().toLowerCase()
        if (isCorrect) { correct++; obtained += q.points; perQuestion.push({ q, ans, isCorrect: true, marks: q.points, subjective: false, aRec }) }
        else { incorrect++; perQuestion.push({ q, ans, isCorrect: false, marks: 0, subjective: false, aRec }) }
      } else {
        // Subjective — pending if not yet graded (gradedAt null). marksAwarded default 0 is not sufficient to tell grading.
        const isGraded = !!aRec?.gradedAt
        const marks = isGraded ? (aRec?.marksAwarded ?? 0) : null
        perQuestion.push({ q, ans, isCorrect: null, marks: marks, subjective: true, aRec, isGraded })
      }
    }
  }
  // For objective-only stats, unanswered already correct (only objective empties)
  // But subjective empties also counted as unanswered; we need to separate objective unanswered
  // Recalc objective unanswered: totalObjective - correct - incorrect
  const objectiveQuestions = questions.filter(q => q.type === "MCQ" || q.type === "TF" || q.type === "TRUE_FALSE")
  const objectiveCount = objectiveQuestions.length
  // If subjective empties inflated unanswered, fix: objectiveUnanswered = objectiveCount - correct - incorrect
  const objectiveUnanswered = Math.max(0, objectiveCount - correct - incorrect)
  // If there were subjective empties, they were counted; replace unanswered with objectiveUnanswered and keep subjective unanswered separately?
  // We'll keep unanswered as objectiveUnanswered for result summary, matching UI expectation (correct+incorrect+unanswered == objective)
  // But for totalQuestions, keep total.
  const percentage = totalMarks > 0 ? Math.round((obtained / totalMarks) * 1000) / 10 : 0
  const passed = percentage >= 40
  // Determine pending evaluation if any subjective not graded (gradedAt null)
  const hasSubjective = questions.some(q => q.type === "SHORT" || q.type === "SHORT_ANSWER" || q.type === "LONG_ANSWER")
  const subjectiveUngraded = perQuestion.filter(p => p.subjective && !p.isGraded).length > 0
  return { correct, incorrect, unanswered: objectiveUnanswered, totalMarks, obtained, percentage, passed, hasSubjective, subjectiveUngraded, perQuestion, objectiveCount }
}

export async function buildReportData(sessionId: string, opts?: { verificationBaseUrl?: string }): Promise<ReportData> {
  const session = await prisma.examSession.findUnique({
    where: { id: sessionId },
    include: {
      exam: { include: { teacher: true } },
      student: true,
      answers: true,
      events: { orderBy: { timestamp: "asc" } },
      integrityReview: { include: { signals: true, notes: { include: { teacher: true } } } },
    },
  })
  if (!session) throw new Error("Session not found")

  const questions = await prisma.question.findMany({ where: { examId: session.examId }, orderBy: { order: "asc" } })
  const answers = await prisma.answer.findMany({ where: { sessionId } })

  // Generate/ensure persistent report ID
  const persistent = await ensurePersistentReport(sessionId, session.examId, session.integrityReview?.id ?? null, session.studentId)
  const reportId = persistent.reportId
  const version = persistent.version || brand.report.version

  const comp = computeResultLike(questions, answers as any)
  const isPendingEvaluation = comp.hasSubjective && comp.subjectiveUngraded

  // Build per-question rows
  const qRows = comp.perQuestion.map((p: any, idx: number) => {
    const q = p.q
    const aRec = p.aRec
    let result: "Correct" | "Incorrect" | "Pending" | "Unanswered" | "Evaluated" = "Unanswered"
    if (p.unanswered) result = "Unanswered"
    else if (p.subjective) {
      if (!p.isGraded) result = "Pending"
      else result = "Evaluated"
    } else {
      result = p.isCorrect ? "Correct" : "Incorrect"
    }
    return {
      order: q.order,
      questionId: q.id,
      text: q.text,
      type: q.type,
      points: q.points,
      studentAnswer: p.ans,
      correctAnswer: (q.type === "SHORT" || q.type === "SHORT_ANSWER" || q.type === "LONG_ANSWER") ? null : q.correctAnswer,
      result,
      marksAwarded: p.marks !== undefined && p.marks !== null ? p.marks : (p.subjective ? null : (p.isCorrect ? q.points : 0)),
      isCorrect: p.isCorrect,
      subjective: !!p.subjective,
    }
  })

  const subjectiveReviews = comp.perQuestion.filter((p: any) => p.subjective).map((p: any) => {
    const q = p.q
    const aRec = p.aRec
    const isGraded = !!aRec?.gradedAt
    return {
      order: q.order,
      questionId: q.id,
      questionText: q.text,
      type: q.type,
      points: q.points,
      studentAnswer: p.ans,
      correctAnswer: null,
      marksAwarded: isGraded ? (aRec?.marksAwarded ?? 0) : null,
      teacherFeedback: aRec?.teacherFeedback ?? null,
      gradedBy: aRec?.gradedBy ?? null,
      gradedAt: aRec?.gradedAt ?? null,
    }
  })

  // Integrity
  const review = session.integrityReview
  const integrity = {
    id: review?.id ?? null,
    score: review?.score ?? null,
    level: review?.level ?? null,
    levelDisplay: review?.level ? levelDisplay(review.level) : null,
    status: review?.status ?? null,
    statusDisplay: review?.status ? statusDisplay(review.status) : null,
    generatedAt: review?.generatedAt ?? null,
    reviewedAt: review?.reviewedAt ?? null,
    reviewedBy: review?.reviewedBy ?? null,
    signals: review ? review.signals.map(s => ({
      id: s.id,
      type: s.type,
      severity: s.severity as any,
      points: s.points,
      confidence: s.confidence,
      description: s.description,
      evidence: (() => { try { return JSON.parse(s.evidence) } catch { return s.evidence } })(),
      summary: s.summary ?? null,
    })) : [],
    requiresReview: review ? review.score >= 60 : false,
  }

  // Timeline
  const timeline = (session.events || []).map(ev => {
    let title = ev.eventType.replace(/_/g, " ")
    if (ev.eventType === "TAB_HIDDEN") title = "Tab visibility changed — hidden"
    if (ev.eventType === "TAB_VISIBLE") title = "Tab became visible"
    if (ev.eventType === "SESSION_STARTED") title = "Exam session started"
    if (ev.eventType === "SESSION_ENDED" || ev.eventType === "SUBMITTED") title = "Exam submitted"
    if (ev.eventType === "QUESTION_ANSWERED") title = "Question answered"
    if (ev.eventType === "ANSWER_CHANGED") title = "Answer changed"
    if (ev.eventType === "COPY") title = "Copy activity"
    if (ev.eventType === "PASTE") title = "Paste activity"
    if (ev.eventType === "HEARTBEAT_GAP") title = "Extended period without recorded activity"
    if (ev.eventType === "CONNECTION_LOST") title = "Connection lost"
    if (ev.eventType === "CONNECTION_RESTORED") title = "Connection restored"
    if (ev.eventType === "FULLSCREEN_EXITED") title = "Fullscreen exited"
    return {
      id: ev.id,
      timestamp: ev.timestamp,
      eventType: ev.eventType,
      title,
      metadata: ev.metadata ? (() => { try { return JSON.parse(ev.metadata) } catch { return ev.metadata } })() : null,
      questionId: ev.questionId,
    }
  })

  // Teacher review
  let teacherReview = null as any
  if (review) {
    const notes = review.notes || []
    const primaryNote = notes[0] || null
    let reviewerName: string | null = null
    if (primaryNote?.teacher?.name) reviewerName = primaryNote.teacher.name
    else if (review.reviewedBy) {
      const u = await prisma.user.findUnique({ where: { id: review.reviewedBy } })
      reviewerName = u?.name ?? null
    }
    // If no note reviewer but assigned reviewer
    if (!reviewerName && review.assignedReviewerId) {
      const u = await prisma.user.findUnique({ where: { id: review.assignedReviewerId } })
      reviewerName = u?.name ?? null
    }
    const comments = primaryNote?.note || null
    teacherReview = {
      status: review.status,
      reviewedBy: review.reviewedBy ?? review.assignedReviewerId ?? null,
      reviewerName,
      reviewDate: review.reviewedAt ?? review.generatedAt ?? null,
      comments,
      notes: notes.map(n => ({ teacher: n.teacher.name, note: n.note, createdAt: n.createdAt })),
    }
  }

  // Clarification
  let clarification: any = null
  try {
    const clar = await prisma.clarification.findFirst({ where: { sessionId }, orderBy: { createdAt: "desc" } })
    if (clar) {
      clarification = {
        id: clar.id,
        message: clar.message,
        response: clar.response,
        status: clar.status,
        createdAt: clar.createdAt,
        respondedAt: clar.respondedAt,
      }
    } else {
      clarification = { id: null, message: null, response: null, status: null, createdAt: null, respondedAt: null }
    }
  } catch {
    clarification = { id: null, message: null, response: null, status: null, createdAt: null, respondedAt: null }
  }

  // Student enrichment
  const studentRecord = session.student as any
  const student: ReportData["student"] = {
    id: session.student.id,
    name: session.student.name,
    email: session.student.email,
    studentId: studentRecord.studentId || `STU-${session.student.id.slice(-5).toUpperCase()}`,
    className: studentRecord.className || "10-A",
    section: studentRecord.section || "A",
    academicYear: studentRecord.academicYear || brand.institutionDefault ? "2026–2027" : "2026–2027",
  }

  const exam: ReportData["exam"] = {
    id: session.exam.id,
    title: session.exam.title,
    subject: session.exam.subject,
    description: session.exam.description,
    teacherId: session.exam.teacherId,
    teacherName: session.exam.teacher.name,
    examDate: session.submittedAt ?? session.startedAt,
    durationMinutes: session.exam.durationMinutes,
    totalMarks: comp.totalMarks,
    totalQuestions: questions.length,
    attemptsAllowed: session.exam.attemptsAllowed,
    className: (session.exam as any).className || null,
    section: (session.exam as any).section || null,
    academicYear: (session.exam as any).academicYear || null,
  }

  const completionTimeSec = session.submittedAt && session.startedAt ? Math.round((new Date(session.submittedAt).getTime() - new Date(session.startedAt).getTime()) / 1000) : null
  const completionText = completionTimeSec ? `${Math.floor(completionTimeSec / 60)}m ${completionTimeSec % 60}s` : null

  let resultStatus: "PASSED" | "FAILED" | "PENDING EVALUATION" = comp.passed ? "PASSED" : "FAILED"
  if (isPendingEvaluation) resultStatus = "PENDING EVALUATION"

  const result: ReportData["result"] = {
    totalQuestions: questions.length,
    objectiveCount: comp.objectiveCount,
    correct: comp.correct,
    incorrect: comp.incorrect,
    unanswered: comp.unanswered,
    totalMarks: comp.totalMarks,
    obtained: comp.obtained,
    percentage: comp.percentage,
    passed: comp.passed,
    status: resultStatus,
    completionTimeSec,
    completionText,
  }

  const verificationBase = opts?.verificationBaseUrl || process.env.FRONTEND_URL || "http://localhost:5173"
  const verificationUrl = `${verificationBase.replace(/\/$/, "")}/verify/report/${reportId}`

  return {
    version,
    reportId,
    generatedAt: new Date(),
    institution: {
      name: brand.institutionDefault,
      academicYear: brand.academicYearDefault,
    },
    student,
    exam,
    result,
    performance: { correct: comp.correct, incorrect: comp.incorrect, unanswered: comp.unanswered, totalQuestions: questions.length },
    questions: qRows,
    subjectiveReviews,
    integrity,
    timeline,
    teacherReview,
    clarification: clarification?.message ? clarification : null,
    verification: {
      reportId,
      verificationUrl,
    },
    meta: {
      isPendingEvaluation,
      hasIntegrity: !!review,
      hasTeacherReview: !!(review && (review.notes.length > 0 || review.reviewedBy)),
      hasClarification: !!(clarification && clarification.message),
      hasSubjective: comp.hasSubjective,
    },
  }
}
