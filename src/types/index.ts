export type ExamStatus = "Draft"|"Scheduled"|"Live"|"Completed"
export type ReviewStatus = "Normal"|"Low Concern"|"Requires Review"|"High Priority Review"
export type ReviewQueueStatus = "Pending"|"Reviewed"
export type QuestionType = "mcq"|"tf"|"short"
export type SignalType = "tab_switch"|"timing"|"rapid_change"|"copy_paste"|"similarity"|"subjective_similarity"|"multi_session"
export type TimelineFilter = "all"|"focus"|"answers"|"clipboard"|"session"

export interface Exam {
  id: string
  title: string
  subject: string
  description: string
  status: ExamStatus
  durationMinutes: number
  questionsCount: number
  studentsCount: number
  submissionsCount: number
  pendingReviews: number
  startDate: string
  endDate: string
  instructions: string
  attempts: number
}

export interface Question {
  id: string
  examId: string
  type: QuestionType
  text: string
  options?: string[]
  correctAnswer: string
  points: number
  required: boolean
  order: number
}

export interface Student {
  id: string
  name: string
  email: string
  avatar?: string
  rollNo: string
}

export interface Submission {
  id: string
  examId: string
  studentId: string
  status: "Not Started"|"In Progress"|"Submitted"
  startedAt?: string
  submittedAt?: string
  score?: number
  answersCount: number
  totalQuestions: number
}

export interface Signal {
  id: string
  type: SignalType
  title: string
  severity: "Low"|"Medium"|"High"
  points: number
  description: string
  evidence: string[]
  details?: string
  icon: string
}

export interface TimelineEvent {
  id: string
  at: string // HH:MM:SS
  timestamp: string // ISO
  title: string
  description?: string
  kind: "focus"|"answer"|"clipboard"|"session"
}

export interface IntegrityReview {
  id: string
  examId: string
  studentId: string
  score: number
  level: ReviewStatus
  signals: Signal[]
  events: TimelineEvent[]
  generatedAt: string
  status: ReviewQueueStatus
  teacherNote?: string
  // analysis
  questionsAnswered: number
  answerChanges: number
  avgResponseSec: number
  fastestSec: number
  slowestSec: number
  responseTimes: {q: string; sec: number}[]
  similarStudentId?: string
  similarityPercent?: number
  similarityTable?: {q: string; a: string; b: string; match: boolean}[]
  subjective?: { questionId: string; question: string; responseA: string; responseB: string; similarity: number }[]
}
