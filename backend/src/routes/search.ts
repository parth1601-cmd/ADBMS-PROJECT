import { Router } from 'express'
import { authRequired } from '../middleware/auth.js'
import { rateLimit } from '../middleware/rateLimit.js'
import { search } from '../controllers/searchController.js'
const r = Router()
r.use(authRequired)
r.get('/', rateLimit({windowMs:60_000, max:20}), search)
export default r
