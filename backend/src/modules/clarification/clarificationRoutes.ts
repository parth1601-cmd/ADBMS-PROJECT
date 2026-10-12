import { Router } from 'express'
import { authRequired } from '../../middleware/auth.js'
import { createClarification, listClarificationsForTeacher, listClarificationsForStudent, respondClarification, getClarification } from './clarificationController.js'

const r = Router()
r.use(authRequired)

r.post('/', createClarification)
r.get('/', (req,res,next)=>{
  if((req as any).user?.role==='TEACHER') return listClarificationsForTeacher(req as any,res,next)
  return listClarificationsForStudent(req as any,res,next)
})
r.get('/teacher', listClarificationsForTeacher)
r.get('/student', listClarificationsForStudent)
r.get('/:id', getClarification)
r.post('/:id/respond', respondClarification)
r.patch('/:id/respond', respondClarification)

export default r
