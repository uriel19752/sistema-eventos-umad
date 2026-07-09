import { Router } from 'express'
import { signupHandler, loginHandler, googleLoginHandler } from '../controllers/auth.controller.js'

const router = Router()

router.post('/signup', signupHandler)
router.post('/login', loginHandler)
router.post('/google', googleLoginHandler)

export default router
