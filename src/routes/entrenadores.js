import { Router } from "express"
import {
  obtenerEntrenadores,
  obtenerEntrenador,
  crearEntrenador,
  actualizarEntrenador,
  eliminarEntrenador,
} from "../controllers/entrenadorController.js"
import { validarEntrenador, validarId } from "../middlewares/validations.js"

const router = Router()

// 🔹 Rutas sin autenticación ni permisos
router.get("/", obtenerEntrenadores)
router.get("/:id", validarId, obtenerEntrenador)
router.post("/", validarEntrenador, crearEntrenador)
router.put("/:id", validarId, validarEntrenador, actualizarEntrenador)
router.delete("/:id", validarId, eliminarEntrenador)

export default router
