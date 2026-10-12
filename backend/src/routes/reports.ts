import { Router } from 'express'
import { authRequired, requireRole } from '../middleware/auth.js'
import { overview, examReport } from '../controllers/reportController.js'
const r = Router()
r.use(authRequired, requireRole('TEACHER'))
r.get('/overview', overview)
r.get('/exams/:id', examReport)
export default r
