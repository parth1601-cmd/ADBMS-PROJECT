import { z } from 'zod'

export const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['TEACHER','STUDENT']).default('STUDENT')
})
export const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) })

const examBaseObject = {
  title: z.string().min(3).max(255),
  description: z.string().min(1).max(5000).optional(),
  subject: z.string().min(2).max(100),
  className: z.string().max(50).optional(),
  section: z.string().max(10).optional(),
  academicYear: z.string().max(20).optional(),
  durationMinutes: z.number().int().min(1).max(300),
  totalMarks: z.number().int().min(0).max(1000).optional(),
  passingMarks: z.number().int().min(0).max(1000).optional(),
  startAt: z.string().nullable().optional(),
  endAt: z.string().nullable().optional(),
  instructions: z.string().max(5000).optional(),
  attemptsAllowed: z.number().int().min(1).max(5).optional(),
  status: z.enum(['DRAFT','SCHEDULED','LIVE','COMPLETED','PUBLISHED','UNPUBLISHED','ARCHIVED']).optional()
}
export const examCreateSchema = z.object(examBaseObject).refine(data=> {
  if(data.totalMarks !== undefined && data.passingMarks !== undefined && data.passingMarks > data.totalMarks) return false
  return true
}, { message:'passingMarks cannot exceed totalMarks', path:['passingMarks']}).refine(data=>{
  if(data.startAt && data.endAt && new Date(data.startAt) >= new Date(data.endAt)) return false
  return true
}, { message:'startAt must be before endAt', path:['startAt']})
export const examUpdateSchema = z.object(Object.fromEntries(Object.entries(examBaseObject).map(([k,v])=> [k, (v as any).optional()])) as any).refine(data=> {
  const d = data as any
  if(d.totalMarks !== undefined && d.passingMarks !== undefined && d.passingMarks > d.totalMarks) return false
  return true
}, { message:'passingMarks cannot exceed totalMarks', path:['passingMarks']}).refine(data=>{
  const d = data as any
  if(d.startAt && d.endAt && new Date(d.startAt) >= new Date(d.endAt)) return false
  return true
}, { message:'startAt must be before endAt', path:['startAt']})

export const questionCreateSchema = z.object({
  type: z.enum(['MCQ','TF','SHORT','TRUE_FALSE','SHORT_ANSWER','LONG_ANSWER']),
  text: z.string().min(5).max(5000),
  points: z.number().int().min(0).max(100),
  required: z.boolean().optional(),
  options: z.array(z.string()).nullable().optional(),
  correctAnswer: z.string().min(1).max(2000),
  order: z.number().int().min(1).optional()
})
export const questionUpdateSchema = questionCreateSchema.partial()

export const answerSchema = z.object({
  questionId: z.string(),
  answer: z.string()
})

export const eventSchema = z.object({
  eventType: z.enum(['TAB_HIDDEN','TAB_VISIBLE','WINDOW_BLUR','WINDOW_FOCUS','QUESTION_OPENED','QUESTION_ANSWERED','ANSWER_CHANGED','RAPID_ANSWER','UNUSUAL_TIME_SPENT','COPY','PASTE','SESSION_STARTED','SESSION_ENDED','SESSION_HEARTBEAT','SUBMITTED','FULLSCREEN_ENTERED','FULLSCREEN_EXITED','CONNECTION_LOST','CONNECTION_RESTORED','HEARTBEAT_GAP']),
  timestamp: z.string().optional(),
  questionId: z.string().nullable().optional(),
  metadata: z.any().optional()
}).refine(e=> {
  // Do not store private clipboard contents - metadata must not contain large raw text
  if(e.metadata && typeof e.metadata === 'object'){
    const str = JSON.stringify(e.metadata)
    if(str.length > 2000) return false
  }
  return true
}, { message:'metadata too large' })
export const eventsBatchSchema = z.object({ events: z.array(eventSchema).min(1).max(100) })
