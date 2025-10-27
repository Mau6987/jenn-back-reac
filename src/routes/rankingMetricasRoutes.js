// routes/rankingMetricasRoutes.js
import express from "express"
import {
  obtenerRankingAlcance,
  obtenerPosicionUsuarioAlcance,
  obtenerRankingPliometria,
  obtenerPosicionUsuarioPliometria,
  obtenerResultadosPersonalesAlcance,
  obtenerResultadosPersonalesPliometria,
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
// ========== PLIOMETRÍA ==========
// GET /ranking/pliometria
// Query: periodo(semanal|mensual|general), posicion, carrera, limit, tipo
router.get("/pliometria", obtenerRankingPliometria)

// GET /ranking/pliometria/posicion/:cuentaId
// Query: periodo(semanal|mensual|general), posicion, carrera, tipo
router.get("/pliometria/posicion/:cuentaId", obtenerPosicionUsuarioPliometria)


// Resultados personales de pliometría
router.get("/pliometria/personal/:cuentaId", obtenerResultadosPersonalesPliometria)

export default router
