// Report DTO — single source of truth for PDF renderer
// Separate DATA from PRESENTATION

export interface ReportStudent {
  id: string
  name: string
  email: string
  studentId: string // e.g., STU-XXXXX or CS21-042
  className: string
  section: string
  academicYear: string
}

export interface ReportExam {
  id: string
  title: string
  subject: string
  description?: string
  teacherId: string
  teacherName: string
  examDate: Date | null
  durationMinutes: number
  totalMarks: number
  totalQuestions: number
  attemptsAllowed: number
  className?: string | null
  section?: string | null
  academicYear?: string | null
}

export interface ReportResult {
  totalQuestions: number
  objectiveCount: number
  correct: number
  incorrect: number
  unanswered: number
  totalMarks: number
  obtained: number
  percentage: number
  passed: boolean
  status: "PASSED" | "FAILED" | "PENDING EVALUATION"
  completionTimeSec: number | null
  completionText: string | null
}

export interface ReportQuestionRow {
  order: number
  questionId: string
  text: string
  type: string
  points: number
  studentAnswer: string | null
  correctAnswer: string | null
  result: "Correct" | "Incorrect" | "Pending" | "Unanswered" | "Evaluated"
  marksAwarded: number | null
  isCorrect: boolean | null
  subjective: boolean
}

export interface ReportSubjectiveReview {
  order: number
  questionId: string
  questionText: string
  type: string
  points: number
  studentAnswer: string | null
  correctAnswer: string | null
  marksAwarded: number | null
  teacherFeedback: string | null
  gradedBy: string | null
  gradedAt: Date | null
}

export interface ReportIntegritySignal {
  id: string
  type: string
  severity: "LOW"|"MEDIUM"|"HIGH"
  points: number
  confidence?: number
  description: string
  evidence: any
  summary?: string | null
}

export interface ReportIntegrity {
  id: string | null
  score: number | null
  level: string | null
  levelDisplay: string | null
  status: string | null
  statusDisplay: string | null
  generatedAt: Date | null
  reviewedAt: Date | null
  reviewedBy: string | null
  signals: ReportIntegritySignal[]
  requiresReview: boolean
}

export interface ReportTimelineEvent {
  id: string
  timestamp: Date
  eventType: string
  title: string
  metadata: any
  questionId: string | null
}

export interface ReportTeacherReview {
  status: string | null
  reviewedBy: string | null
  reviewerName: string | null
  reviewDate: Date | null
  comments: string | null
  notes: Array<{ teacher: string; note: string; createdAt: Date }>
}

export interface ReportClarification {
  id: string | null
  message: string | null
  response: string | null
  status: string | null
  createdAt: Date | null
  respondedAt: Date | null
}

export interface ReportData {
  version: string // e.g., "1.0"
  reportId: string // persistent EG-YYYY-XXXXXX
  generatedAt: Date
  generatedBy?: string | null
  institution: {
    name: string
    academicYear: string
  }
  student: ReportStudent
  exam: ReportExam
  result: ReportResult
  performance: {
    correct: number
    incorrect: number
    unanswered: number
    totalQuestions: number
  }
  questions: ReportQuestionRow[]
  subjectiveReviews: ReportSubjectiveReview[]
  integrity: ReportIntegrity
  timeline: ReportTimelineEvent[]
  teacherReview: ReportTeacherReview | null
  clarification: ReportClarification | null
  verification: {
    reportId: string
    verificationUrl: string | null
    qrDataUrl?: string | null
  }
  // Raw helpers for renderer
  meta: {
    isPendingEvaluation: boolean
    hasIntegrity: boolean
    hasTeacherReview: boolean
    hasClarification: boolean
    hasSubjective: boolean
  }
}
