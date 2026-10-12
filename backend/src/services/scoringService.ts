// @ts-nocheck
/**
 * Centralized scoring service - authoritative backend scoring, no frontend trust.
 * Handles objective (MCQ, TF) and subjective (SHORT/LONG) separation.
 */
import { prisma } from '../utils/prisma.js'
import { TxClient } from '../utils/transaction.js'

export type PerQuestionResult = {
  questionId: string
  text: string
  type: string
  points: number
  studentAnswer: string | null
  correctAnswer: string | null
  isCorrect: boolean | null
  marksAwarded: number | null
  unanswered?: boolean
  subjective?: boolean
}

export type ScoringResult = {
  totalQuestions: number
  objectiveCount: number
  correct: number
  incorrect: number
  unanswered: number
  totalMarks: number
  obtained: number
  percentage: number
  passed: number
  passedBoolean: boolean
  completionTimeSec: number | null
  perQuestion: PerQuestionResult[]
}

export async function calculateScore(sessionId: string, opts: { tx?: TxClient; passingPercentage?: number } = {}): Promise<ScoringResult> {
  const db: any = opts.tx || prisma
  const session = await db.examSession.findUnique({ where: { id: sessionId }, include: { exam: true } })
  if (!session) throw new Error('Session not found')
  const questions = await db.question.findMany({ where: { examId: session.examId }, orderBy: { order: 'asc' } })
  const answers = await db.answer.findMany({ where: { sessionId } })
  const answerMap = new Map(answers.map((a: any) => [a.questionId, a.answer]))

  let correct = 0,
    incorrect = 0,
    unanswered = 0,
    obtained = 0,
    totalMarks = 0
  const perQuestion: PerQuestionResult[] = []

  for (const q of questions) {
    totalMarks += q.points
    const ans = answerMap.get(q.id)
    if (ans === undefined || ans === null || String(ans).trim() === '') {
      unanswered++
      perQuestion.push({
        questionId: q.id,
        text: q.text,
        type: q.type,
        points: q.points,
        studentAnswer: null,
        correctAnswer: q.type === 'SHORT' || q.type === 'SHORT_ANSWER' || q.type === 'LONG_ANSWER' ? null : q.correctAnswer,
        isCorrect: q.type === 'SHORT' || q.type === 'SHORT_ANSWER' || q.type === 'LONG_ANSWER' ? null : false,
        marksAwarded: q.type === 'SHORT' || q.type === 'SHORT_ANSWER' || q.type === 'LONG_ANSWER' ? null : 0,
        unanswered: true,
      })
    } else {
      if (q.type === 'MCQ' || q.type === 'TF' || q.type === 'TRUE_FALSE') {
        const isCorrect = String(ans).trim().toLowerCase() === String(q.correctAnswer).trim().toLowerCase()
        if (isCorrect) {
          correct++
          obtained += q.points
          perQuestion.push({
            questionId: q.id,
            text: q.text,
            type: q.type,
            points: q.points,
            studentAnswer: ans,
            correctAnswer: q.correctAnswer,
            isCorrect: true,
            marksAwarded: q.points,
          })
        } else {
          incorrect++
          perQuestion.push({
            questionId: q.id,
            text: q.text,
            type: q.type,
            points: q.points,
            studentAnswer: ans,
            correctAnswer: q.correctAnswer,
            isCorrect: false,
            marksAwarded: 0,
          })
        }
      } else {
        // SHORT, LONG_ANSWER subjective: not auto-graded, marks NULL pending teacher evaluation
        perQuestion.push({
          questionId: q.id,
          text: q.text,
          type: q.type,
          points: q.points,
          studentAnswer: ans,
          correctAnswer: null,
          isCorrect: null,
          marksAwarded: null,
          subjective: true,
        })
      }
    }
  }

  const totalQuestions = questions.length
  const objectiveCount = questions.filter((q: any) => q.type !== 'SHORT' && q.type !== 'SHORT_ANSWER' && q.type !== 'LONG_ANSWER').length
  const percentage = totalMarks > 0 ? Math.round((obtained / totalMarks) * 100 * 10) / 10 : 0
  const passingPercentage = opts.passingPercentage ?? 40
  const passedBoolean = percentage >= passingPercentage
  const passed = passedBoolean ? 1 : 0
  const completionTimeSec =
    session.submittedAt && session.startedAt
      ? Math.round((new Date(session.submittedAt).getTime() - new Date(session.startedAt).getTime()) / 1000)
      : null

  // Precise handling: avoid floating errors; percentage already rounded to 1 decimal
  return {
    totalQuestions,
    objectiveCount,
    correct,
    incorrect,
    unanswered,
    totalMarks,
    obtained,
    percentage,
    passed,
    passedBoolean,
    completionTimeSec,
    perQuestion,
  }
}

export function validatePassingMarks(totalMarks: number, passingMarks: number) {
  if (passingMarks < 0) throw new Error('passingMarks must be >=0')
  if (totalMarks < 0) throw new Error('totalMarks must be >=0')
  if (passingMarks > totalMarks) throw new Error('passingMarks cannot exceed totalMarks')
}

export function percentageFormula(obtained: number, total: number): number {
  if (total <= 0) return 0
  return Math.round((obtained / total) * 100 * 10) / 10
}
