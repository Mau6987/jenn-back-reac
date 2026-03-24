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

// Resultados personales de alcance - RUTA ACTUALIZADA
router.get("/alcance/resultados-personales/:cuentaId", obtenerResultadosPersonalesAlcance)

// ========== SALTO ==========
// GET /ranking/salto
// Query: periodo(semanal|mensual|general), posicion, carrera, limit, tipo
router.get("/salto", obtenerRankingSalto)

// GET /ranking/salto/posicion/:cuentaId
// Query: periodo(semanal|mensual|general), posicion, carrera, tipo
router.get("/salto/posicion/:cuentaId", obtenerPosicionUsuarioSalto)

// Resultados personales de salto - RUTA ACTUALIZADA
router.get("/salto/resultados-personales/:cuentaId", obtenerResultadosPersonalesSalto)

export default router