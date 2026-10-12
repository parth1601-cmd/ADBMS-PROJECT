import { Router } from "express"
import { authRequired, requireRole } from "../../middleware/auth.js"
import { getAuditLogs } from "./auditController.js"

const r = Router()
r.use(authRequired, requireRole("TEACHER"))
r.get("/", getAuditLogs)
export default r
