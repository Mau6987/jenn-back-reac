// routes/healthRoutes.js
import express from "express"
import {
  checkBackend,
  checkDatabase,
  checkHealth
} from "../controllers/Healthcontroller.js"

const router = express.Router()

// GET /api/health/backend - Verificar solo el backend (API)
router.get("/backend", checkBackend)

// GET /api/health/database - Verificar solo la base de datos
router.get("/database", checkDatabase)

// GET /api/health - Health check completo (backend + database)
router.get("/", checkHealth)

export default router