import { Router } from 'express'
import { authRequired } from '../middleware/auth.js'
import { listNotifications, markRead } from '../controllers/notificationController.js'
import { markOneRead, markAllRead } from '../modules/notifications/notificationController.js'
const r = Router()
r.use(authRequired)
r.get('/', listNotifications)
r.post('/read', markRead)
r.patch('/:id/read', markOneRead)
r.post('/read-all', markAllRead)
export default r
