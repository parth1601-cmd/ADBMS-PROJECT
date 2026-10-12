import { Router } from "express"
import { authRequired, requireRole } from "../../middleware/auth.js"
import { generateStudentReport, generateIntegrityReport, generateExamAnalyticsReport } from "./reportsController.js"
import { rateLimit } from "../../middleware/rateLimit.js"

const r = Router()
r.use(authRequired)

r.get("/student/:sessionId", generateStudentReport)
r.get("/student/:id/pdf", generateStudentReport)
r.get("/integrity/:reviewId", generateIntegrityReport)
r.get("/integrity/:id/pdf", generateIntegrityReport)
r.get("/exam/:examId", requireRole("TEACHER"), rateLimit({windowMs:60_000, max:10}), generateExamAnalyticsReport)

export default r
