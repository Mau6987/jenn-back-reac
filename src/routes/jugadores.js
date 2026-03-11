import { Router } from "express"
import {
  obtenerJugadores,
  obtenerJugador,
  crearJugador,
  actualizarJugador
} from "../controllers/jugadorController.js"
import { validarJugador, validarId } from "../middlewares/validations.js"

const router = Router()

// 🔹 Obtener todos los jugadores
router.get("/", obtenerJugadores)

// 🔹 Obtener un jugador por ID
router.get("/:id", validarId, obtenerJugador)

// 🔹 Crear un nuevo jugador
router.post("/", validarJugador, crearJugador)

// 🔹 Actualizar jugador
router.put("/:id", validarId, validarJugador, actualizarJugador)

export default router
  