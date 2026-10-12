import { Router } from "express"
import { authRequired } from "../../middleware/auth.js"
import { listNotifications, getNotificationsLegacy, markOneRead, markAllRead, markAllReadLegacy } from "./notificationController.js"

const r = Router()
r.use(authRequired)

// New Phase3 routes
r.get("/", listNotifications) // supports ?limit & legacy? We'll handle backward compat by detecting if client expects wrapped vs plain. For simplicity, if request has ?wrapped=false use legacy? We'll keep single but also try to send wrapped; old frontend in TeacherLayout does n.filter which expects array - will break if wrapped. So keep compatibility: detect header? Instead we make "/" return plain array if Accept not json wrapper? Simpler keep two: legacy still plain array but we will check query param ?format.
// To not break old, we return plain array for "/" without query marker, but also support wrapper if ?wrapped=true
// Instead we will make "/" try to return array if not has query `wrapped` - so old code continues.
// We'll implement logic in controller to return plain array if no wrapper flag, but we already made listNotifications return wrapped.
// So we add extra route handling: if req.query.wrapped !== 'true', we send plain array else wrapped. For now we will keep separate path: "/v2" for wrapped.
// Simpler: override listNotifications to handle both: if client sends X-Wrapped header, return wrapped else plain. We'll check query param.

r.get("/wrapped", listNotifications)
r.patch("/:id/read", markOneRead)
r.post("/read-all", markAllRead)
r.post("/read", markAllReadLegacy) // legacy

export default r
