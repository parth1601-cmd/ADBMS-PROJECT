import { Router } from 'express'
import { authRequired, requireRole } from '../middleware/auth.js'
import { listExams, getExam, createExam, updateExam, deleteExam, publishExam } from '../controllers/examController.js'
const r = Router()
r.use(authRequired)
r.get('/', listExams)
r.post('/', requireRole('TEACHER'), createExam)
r.get('/:id', getExam)
r.patch('/:id', requireRole('TEACHER'), updateExam)
r.delete('/:id', requireRole('TEACHER'), deleteExam)
r.post('/:id/publish', requireRole('TEACHER'), publishExam)
export default r
