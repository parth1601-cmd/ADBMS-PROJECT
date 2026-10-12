export interface ReviewDTO {
  id: string
  sessionId: string
  studentId: string | null
  examId: string | null
  score: number
  originalScore: number | null
  overrideScore: number | null
  overrideReason: string | null
  overriddenBy: string | null
  overriddenAt: Date | null
  level: string
  category: string | null
  status: string
  generatedAt: Date
  reviewedAt: Date | null
  reviewedBy: string | null
  assignedReviewerId: string | null
  assignedAt: Date | null
  version: number
  signals: IntegritySignalDTO[]
  notes: ReviewNoteDTO[]
}

export interface IntegritySignalDTO {
  id: string
  integrityReviewId: string
  type: string
  severity: string
  points: number
  confidence: number
  scoreContribution: number | null
  summary: string | null
  description: string
  evidence: string
  metadata: string | null
  createdAt: Date
}

export interface ReviewNoteDTO {
  id: string
  integrityReviewId: string
  teacherId: string
  note: string
  content: string | null
  createdAt: Date
  updatedAt: Date
  teacher?: {
    id: string
    name: string
  }
}

export interface ReviewStatusUpdateDTO {
  reviewId: string
  newStatus: string
  reviewerId: string
  note?: string
}