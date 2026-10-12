import { Router } from 'express'
import { authRequired, requireRole } from '../middleware/auth.js'
import { rateLimit } from '../middleware/rateLimit.js'
import {
  listStudentExams, startExam, getSession, saveAnswer, postEvents, submitSession,
  getStudentResults, getProfile,
  getDashboard, listUpcomingExams, listInProgressExams, listCompletedExams,
  getStudentExamById, getResultDetail, getIntegrityReports, getIntegrityReportDetail,
  generatePdf, postHeartbeat, toggleMarkForReview, getMarkedForReview, getAnnouncements
} from '../controllers/studentController.js'
const r = Router()
r.use(authRequired)

// Dashboard and exam listing
r.get('/dashboard', requireRole('STUDENT'), getDashboard)
r.get('/exams', requireRole('STUDENT'), listStudentExams)
r.get('/exams/upcoming', requireRole('STUDENT'), listUpcomingExams)
r.get('/exams/in-progress', requireRole('STUDENT'), listInProgressExams)
r.get('/exams/completed', requireRole('STUDENT'), listCompletedExams)
r.get('/exams/:id', requireRole('STUDENT'), getStudentExamById)
r.post('/exams/:id/start', requireRole('STUDENT'), rateLimit({windowMs:60_000, max:10}), startExam)

// Sessions
r.get('/sessions/:id', getSession)
r.post('/sessions/:id/answers', requireRole('STUDENT'), rateLimit({windowMs:60_000, max:60}), saveAnswer)
r.put('/sessions/:id/answers', requireRole('STUDENT'), rateLimit({windowMs:60_000, max:60}), saveAnswer)
r.post('/sessions/:id/events', requireRole('STUDENT'), rateLimit({windowMs:60_000, max:80}), postEvents)
r.post('/sessions/:id/heartbeat', requireRole('STUDENT'), rateLimit({windowMs:60_000, max:30}), postHeartbeat)
r.post('/sessions/:id/mark-review', requireRole('STUDENT'), toggleMarkForReview)
r.get('/sessions/:id/mark-review', getMarkedForReview)
r.post('/sessions/:id/submit', requireRole('STUDENT'), rateLimit({windowMs:60_000, max:10}), submitSession)

// Results & Integrity
r.get('/results', requireRole('STUDENT'), getStudentResults)
r.get('/results/:sessionId', requireRole('STUDENT'), getResultDetail)
r.get('/results/:sessionId/pdf', rateLimit({windowMs:60_000, max:10}), generatePdf) // auth checked inside but requires ownership
r.get('/integrity-reports', requireRole('STUDENT'), getIntegrityReports)
r.get('/integrity-reports/:sessionId', requireRole('STUDENT'), getIntegrityReportDetail)

// Profile
r.get('/profile', getProfile)

// Announcements (student + teacher shared via live module)
r.get('/announcements', getAnnouncements)
r.get('/exams/:examId/announcements', getAnnouncements)

// Legacy alias for PDF per spec: GET /api/student/results/:sessionId/pdf already covered
// Also support GET /api/student/sessions/:id/pdf alias
r.get('/sessions/:id/pdf', generatePdf)

export default r
