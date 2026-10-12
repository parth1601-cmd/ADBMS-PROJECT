export interface ExamAnalyticsDTO {
  examId: string
  examTitle: string
  subject: string
  status: string
  totalStudents: number
  startedCount: number
  submittedCount: number
  expiredCount: number
  averageScore: number
  highestScore: number
  lowestScore: number
  passCount: number
  failCount: number
  passRate: number
  averageIntegrityScore: number
  highPriorityReviews: number
  reviewCount: number
  questionStats: QuestionStatDTO[]
}

export interface QuestionStatDTO {
  id: string
  order: number
  text: string
  type: string
  points: number
  attempts: number
  correct: number
  incorrect: number
  correctPct: number
  difficulty: string
}

export interface StudentAnalyticsDTO {
  studentId: string
  studentName: string
  examsCompleted: number
  averageScore: number
  passRate: number
  subjectPerformance: SubjectPerformanceDTO[]
  recentResults: RecentResultDTO[]
  integritySummary: {
    total: number
    reviewed: number
    requiresFollowUp: number
    pending: number
    averageIntegrityScore: number
  }
}

export interface SubjectPerformanceDTO {
  subject: string
  averageScore: number
  count: number
}

export interface RecentResultDTO {
  examId: string
  title: string
  subject: string
  submittedAt: Date
  score: number
  obtained: number
  totalMarks: number
  passed: boolean
}

export interface IntegrityAnalyticsDTO {
  totalSubmissions: number
  reviewsGenerated: number
  averageIntegrityScore: number
  highPriorityReviews: number
  reviewRate: number
  averageTabEvents: number
  averageAnswerChanges: number
  averageClipboardEvents: number
  averageSessionAnomalies: number
  distribution: Record<string, number>
  signalFrequency: Array<{ type: string; count: number; avgPerReview: number }>
  reviewsOverTime: Array<{ date: string; count: number }>
}