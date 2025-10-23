import { Router } from "express"
import {
  obtenerEntrenadores,
  obtenerEntrenador,
  crearEntrenador,
  actualizarEntrenador,
  eliminarEntrenador,
} from "../controllers/entrenadorController.js"
import { validarId } from "../middlewares/validations.js"

const router = Router()

// Rutas para entrenadores
router.get("/", obtenerEntrenadores)
router.get("/:id", validarId, obtenerEntrenador)
router.post("/", crearEntrenador)
router.put("/:id", validarId, actualizarEntrenador)
router.delete("/:id", validarId, eliminarEntrenador)

export default router
