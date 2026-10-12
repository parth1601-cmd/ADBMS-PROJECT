import { Router } from 'express'
import { authRequired, requireRole } from '../middleware/auth.js'
import { listStudents, updateProfile, getSettings, updateSettings } from '../controllers/userController.js'
const r = Router()
r.use(authRequired)
r.get('/students', requireRole('TEACHER'), listStudents)
r.patch('/profile', updateProfile)
r.get('/settings', getSettings)
r.patch('/settings', updateSettings)
export default r
