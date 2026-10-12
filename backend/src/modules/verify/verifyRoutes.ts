import { Router } from "express"
import { verifyReport, verifyReportPage } from "./verifyController.js"

const r = Router()

// Public verification — no auth required, but safe data only
r.get("/report/:reportId", verifyReport)

// Browser-friendly HTML verification page (for QR scanning)
r.get("/report/:reportId/page", verifyReportPage)
r.get("/report/:reportId/html", verifyReportPage)

export default r
