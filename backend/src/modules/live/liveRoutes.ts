import { Router } from 'express'
import { authRequired, requireRole } from '../../middleware/auth.js'
import { getLiveSessions, getLiveSessionDetail, getLiveEvents, streamLive, postBroadcast, getBroadcastsForStudent } from './liveController.js'

const r = Router()
r.use(authRequired)

r.get('/sessions', requireRole('TEACHER'), getLiveSessions)
r.get('/sessions/:id', requireRole('TEACHER'), getLiveSessionDetail)
r.get('/events', requireRole('TEACHER'), getLiveEvents)
r.get('/stream', requireRole('TEACHER'), streamLive)

// Broadcast
r.post('/exams/:examId/broadcast', requireRole('TEACHER'), postBroadcast)
r.get('/exams/:examId/broadcasts', getBroadcastsForStudent)
r.get('/broadcasts', getBroadcastsForStudent)

export default r
