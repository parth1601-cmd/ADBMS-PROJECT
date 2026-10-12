import { Router } from 'express'
import { authRequired, requireRole } from '../middleware/auth.js'
import { listQuestions, createQuestion, updateQuestion, deleteQuestion, reorderQuestions } from '../controllers/questionController.js'
const r = Router()
r.use(authRequired)
r.get('/exams/:id/questions', listQuestions)
r.post('/exams/:id/questions', requireRole('TEACHER'), createQuestion)
r.post('/exams/:id/questions/reorder', requireRole('TEACHER'), reorderQuestions)
r.patch('/questions/:id', requireRole('TEACHER'), updateQuestion)
r.delete('/questions/:id', requireRole('TEACHER'), deleteQuestion)
export default r
