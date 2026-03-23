// routes/reacciones.js
import express from "express"
import {
  iniciarReaccion,
  finalizarReaccion,
  obtenerReacciones,
  obtenerReaccionesPorUsuario,
  eliminarReaccion,
  sendCommand,
} from "../controllers/Reaccioncontroller.js"

const router = express.Router()

// Iniciar reacción
router.post("/iniciar", iniciarReaccion)

// Finalizar reacción
router.put("/finalizar/:id", finalizarReaccion)

// Obtener todas las reacciones
router.get("/", obtenerReacciones)

// Obtener reacciones por jugador
router.get("/usuario/:cuentaId", obtenerReaccionesPorUsuario)

// Eliminar reacción
router.delete("/:id", eliminarReaccion)

// Enviar comando a dispositivo
router.post("/comando", sendCommand)

export default router