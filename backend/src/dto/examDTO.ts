export interface ExamDTO {
  id: string
  title: string
  description: string
  subject: string
  className: string | null
  section: string | null
  academicYear: string | null
  teacherId: string
  status: string
  durationMinutes: number
  totalMarks: number
  passingMarks: number
  startAt: Date | null
  endAt: Date | null
  attemptsAllowed: number
  instructions: string | null
  publishedAt: Date | null
  createdAt: Date
  updatedAt: Date
  questionCount: number
}

export interface ExamCreateDTO {
  title: string
  description: string
  subject: string
  className?: string | null
  section?: string | null
  academicYear?: string | null
  durationMinutes: number
  totalMarks?: number
  passingMarks?: number
  startAt?: Date | null
  endAt?: Date | null
  instructions?: string | null
  attemptsAllowed?: number
  status?: string
}

export interface ExamUpdateDTO {
  title?: string
  description?: string
  subject?: string
  className?: string | null
  section?: string | null
  academicYear?: string | null
  durationMinutes?: number
  totalMarks?: number
  passingMarks?: number
  startAt?: Date | null
  endAt?: Date | null
  instructions?: string | null
  attemptsAllowed?: number
  status?: string
}