import express from "express"
import {
  obtenerResultadosPersonales,
  obtenerRankingGeneral,
  obtenerPosicionUsuario, // Importando nuevo controlador
} from "../controllers/rankingController.js"

const router = express.Router()

// Ruta para obtener resultados personales de un usuario
// Query params: periodo (semanal, mensual, general)
router.get("/personal/:cuentaId", obtenerResultadosPersonales)

// Ruta para obtener ranking general (top 5)
// Query params: periodo (semanal, mensual, general), posicion, carrera
router.get("/general", obtenerRankingGeneral)

// Query params: periodo (semanal, mensual, general), posicion, carrera
router.get("/posicion/:cuentaId", obtenerPosicionUsuario)

export default router
