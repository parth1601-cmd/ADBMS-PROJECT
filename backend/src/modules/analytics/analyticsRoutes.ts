import { Router } from "express"
import { authRequired, requireRole } from "../../middleware/auth.js"
import { overview, examAnalytics, classAnalytics, studentAnalytics, integrityAnalytics, subjectAnalytics } from "./analyticsController.js"

const r = Router()
r.use(authRequired, requireRole("TEACHER"))

r.get("/overview", overview)
r.get("/exams/:examId", examAnalytics)
r.get("/exams/:id", examAnalytics) // alias
r.get("/classes", classAnalytics)
r.get("/students/:studentId", studentAnalytics)
r.get("/students/:id/analytics", studentAnalytics)
r.get("/integrity", integrityAnalytics)
r.get("/subjects", subjectAnalytics)
r.get("/subject", subjectAnalytics)

export default r
