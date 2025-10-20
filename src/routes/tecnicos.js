import { Router } from "express"
import {
  obtenerTecnicos,
  obtenerTecnico,
  crearTecnico,
  actualizarTecnico,
  eliminarTecnico,
} from "../controllers/tecnicoController.js"
import { validarTecnico, validarId } from "../middlewares/validations.js"

const router = Router()

// 🔹 Rutas sin autenticación ni permisos
router.get("/", obtenerTecnicos)
router.get("/:id", validarId, obtenerTecnico)
router.post("/", validarTecnico, crearTecnico)
router.put("/:id", validarId, validarTecnico, actualizarTecnico)
router.delete("/:id", validarId, eliminarTecnico)

export default router
