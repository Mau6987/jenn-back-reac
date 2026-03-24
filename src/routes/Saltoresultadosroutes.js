// routes/saltoResultadosRoutes.js
// Montar en app.js:  app.use("/api/saltos/resultados", saltoResultadosRouter)
import { Router } from "express"

import {
  obtenerResultadosSaltoPersonal,
  obtenerSesionesSalto,
  obtenerChartSalto,
  obtenerResultadosSaltoGeneral,
} from "../controllers/Saltoresultadoscontroller.js"

const router = Router()

// Todos los endpoints requieren autenticación


// ── Personal ────────────────────────────────────────────────────────────────
// GET /api/saltos/resultados/personal/:cuentaId
//   ?desde=YYYY-MM-DD &hasta=YYYY-MM-DD  (o ?periodo=general|semanal|mensual)
router.get("/personal/:cuentaId", obtenerResultadosSaltoPersonal)

// GET /api/saltos/resultados/personal/:cuentaId/sesiones
//   ?desde &hasta &tipo=salto simple|salto conos
router.get("/personal/:cuentaId/sesiones", obtenerSesionesSalto)

// GET /api/saltos/resultados/personal/:cuentaId/chart
//   ?desde &hasta
router.get("/personal/:cuentaId/chart", obtenerChartSalto)

// ── General ──────────────────────────────────────────────────────────────────
// GET /api/saltos/resultados/general
//   ?desde &hasta &periodo
router.get("/general", obtenerResultadosSaltoGeneral)

export default router