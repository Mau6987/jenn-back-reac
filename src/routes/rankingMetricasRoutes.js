// routes/rankingMetricasRoutes.js
import express from "express"
import {
  obtenerRankingAlcance,
  obtenerPosicionUsuarioAlcance,
  obtenerRankingSalto,
  obtenerPosicionUsuarioSalto,
  obtenerResultadosPersonalesAlcance,
  obtenerResultadosPersonalesSalto,
} from "../controllers/rankingMetricasController.js"

const router = express.Router()

// ========== ALCANCE ==========
// GET /ranking/alcance
// Query: periodo(semanal|mensual|general), posicion, carrera, limit
router.get("/alcance", obtenerRankingAlcance)

// GET /ranking/alcance/posicion/:cuentaId
// Query: periodo(semanal|mensual|general), posicion, carrera
router.get("/alcance/posicion/:cuentaId", obtenerPosicionUsuarioAlcance)

// Resultados personales de alcance
router.get("/alcance/personal/:cuentaId", obtenerResultadosPersonalesAlcance)

// ========== SALTO ==========
// GET /ranking/salto
// Query: periodo(semanal|mensual|general), posicion, carrera, limit, tipo
router.get("/salto", obtenerRankingSalto)

// GET /ranking/salto/posicion/:cuentaId
// Query: periodo(semanal|mensual|general), posicion, carrera, tipo
router.get("/salto/posicion/:cuentaId", obtenerPosicionUsuarioSalto)

// Resultados personales de salto
router.get("/salto/personal/:cuentaId", obtenerResultadosPersonalesSalto)

export default router