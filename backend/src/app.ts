import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import authRoutes from './routes/auth.js'
import examRoutes from './routes/exams.js'
import questionRoutes from './routes/questions.js'
import studentRoutes from './routes/student.js'
import reviewRoutes from './routes/reviews.js'
import reportRoutes from './routes/reports.js'
import notificationRoutes from './routes/notifications.js'
import searchRoutes from './routes/search.js'
import userRoutes from './routes/users.js'
import auditRoutes from './modules/audit/auditRoutes.js'
import analyticsRoutes from './modules/analytics/analyticsRoutes.js'
import newReportRoutes from './modules/reports/reportsRoutes.js'
import newNotificationRoutes from './modules/notifications/notificationRoutes.js'
import liveRoutes from './modules/live/liveRoutes.js'
import gradingRoutes from './modules/grading/gradingRoutes.js'
import clarificationRoutes from './modules/clarification/clarificationRoutes.js'
import verifyRoutes from './modules/verify/verifyRoutes.js'
import { errorHandler } from './middleware/errorHandler.js'
import { securityHeaders, requestIdMiddleware } from './middleware/helmet.js'
import { prisma } from './utils/prisma.js'
import adminHealthRoutes from './routes/admin.js'

const app = express()
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173'

app.use(requestIdMiddleware)
app.use(securityHeaders)
app.use(cors({ origin: [FRONTEND_URL, 'http://localhost:5173', 'http://localhost:5174'], credentials:true }))
app.use(express.json({ limit:'1mb'}))
app.use(express.urlencoded({ extended: false, limit: '1mb' }))
app.use(cookieParser())

app.get('/api/health', async (_req,res)=> {
  try{
    await prisma.$queryRaw`SELECT 1`
    res.json({ status:'ok', timestamp: new Date().toISOString(), database:'connected', uptime: process.uptime() })
  }catch(e){
    res.status(503).json({ status:'unhealthy', timestamp: new Date().toISOString(), database:'disconnected' })
  }
})
app.get('/api/ready', async (_req,res)=> {
  try{
    await prisma.$queryRaw`SELECT 1`
    res.json({ status:'ready', timestamp: new Date().toISOString() })
  }catch{
    res.status(503).json({ status:'not-ready' })
  }
})

app.use('/api/auth', authRoutes)
app.use('/api/exams', examRoutes)
app.use('/api', questionRoutes)
app.use('/api/student', studentRoutes)
app.use('/api/reviews', reviewRoutes)
app.use('/api/reports', reportRoutes)
app.use('/api/notifications', notificationRoutes)
app.use('/api/search', searchRoutes)
app.use('/api/users', userRoutes)
app.use('/api/admin', adminHealthRoutes)

// Phase 3 new modular APIs
app.use('/api/teacher/integrity-reviews', reviewRoutes) // alias for reviewRoutes under teacher path
app.use('/api/teacher/analytics', analyticsRoutes)
app.use('/api/teacher/audit-log', auditRoutes)
app.use('/api/teacher/reports', newReportRoutes)
app.use('/api/notifications/v2', newNotificationRoutes)
app.use('/api/teacher/live', liveRoutes)
app.use('/api/teacher/grading', gradingRoutes)
app.use('/api/clarifications', clarificationRoutes)
app.use('/api/teacher/clarifications', clarificationRoutes)
app.use('/api/verify', verifyRoutes)
app.use('/verify', verifyRoutes) // alias for QR conceptual route /verify/report/:reportId
// Provide unified notifications with extended endpoints under /api/notifications (override legacy)
// Remove legacy mount duplication: keep legacy already mounted above, new extends via additional routes mounted at subpath
// Also mount analytics under legacy teacher path alias
app.use('/api/teacher/analytics/overview', analyticsRoutes) // no-op? already handled



app.use((req,res)=> res.status(404).json({ error:'Not found', path: req.path }))

app.use(errorHandler)

export default app
