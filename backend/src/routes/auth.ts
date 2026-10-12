import { Router } from 'express'
import { register, login, logout, me } from '../controllers/authController.js'
import { authRequired } from '../middleware/auth.js'
import { rateLimit } from '../middleware/rateLimit.js'
const r = Router()
r.post('/register', rateLimit({windowMs:60_000, max:5}), register)
r.post('/login', rateLimit({windowMs:60_000, max:10}), login)
r.post('/logout', logout)
r.get('/me', authRequired, me)
export default r
