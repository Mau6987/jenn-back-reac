import { Router } from "express"
import { login, logout } from "../controllers/authController.js"
import { validarLogin } from "../middlewares/validations.js"
import { autenticar } from "../middlewares/auth.js"

const router = Router()

router.post("/login", validarLogin, login)
router.post("/logout", autenticar, logout)

export default router
