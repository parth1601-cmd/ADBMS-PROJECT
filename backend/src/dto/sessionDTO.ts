export interface SessionDTO {
  id: string
  examId: string
  studentId: string
  startedAt: Date
  deadlineAt: Date | null
  submittedAt: Date | null
  status: string
  lastActivityAt: Date
  version: number
  exam?: {
    id: string
    title: string
    subject: string
    durationMinutes: number
    teacherId: string
  }
}

export interface SessionStartDTO {
  sessionId: string
  examId: string
  studentId: string
  startedAt: Date
  deadlineAt: Date
  status: string
  isNew: boolean
}

export interface SessionResultDTO {
  sessionId: string
  examTitle: string
  obtained: number
  totalMarks: number
  percentage: number
  passed: boolean
  status: string
  submittedAt: Date | null
  integrityReview?: {
    id: string
    score: number
    level: string
    status: string
  }
}