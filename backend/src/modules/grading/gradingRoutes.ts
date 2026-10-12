import { Router } from 'express'
import { authRequired, requireRole } from '../../middleware/auth.js'
import { getGradingQueue, gradeAnswer, getSessionForGrading, bulkGrade } from './gradingController.js'

const r = Router()
r.use(authRequired, requireRole('TEACHER'))

r.get('/', getGradingQueue)
r.get('/queue', getGradingQueue)
r.get('/sessions/:sessionId', getSessionForGrading)
r.post('/bulk', bulkGrade)
r.patch('/answers/:answerId', gradeAnswer)
r.post('/answers/:answerId/grade', gradeAnswer)

export default r
