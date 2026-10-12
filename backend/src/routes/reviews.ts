import { Router } from 'express'
import { authRequired, requireRole } from '../middleware/auth.js'
import { listReviews, getReview, addNote, updateStatus, getTimeline, getSimilarity, assignReview, getReviewAudit, updateNote, compareStudents } from '../controllers/reviewController.js'
import { rateLimit } from '../middleware/rateLimit.js'
const r = Router()
r.use(authRequired, requireRole('TEACHER'))
r.get('/', listReviews)
r.get('/compare', compareStudents)
r.get('/:id', getReview)
r.get('/:id/timeline', getTimeline)
r.get('/:id/similarity', getSimilarity)
r.get('/:id/audit', getReviewAudit)
r.post('/:id/notes', rateLimit({windowMs:60_000, max:20}), addNote)
r.patch('/:id/notes/:noteId', updateNote)
r.patch('/:id/assign', assignReview)
r.patch('/:id/status', rateLimit({windowMs:60_000, max:30}), updateStatus)
export default r
