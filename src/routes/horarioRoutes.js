// routes/horarioRoutes.js
import express from "express";
import {
  crearHorario,
  obtenerHorarios,
  obtenerHorario,
  actualizarHorario,
  eliminarHorario
} from "../controllers/HorarioController.js";

const router = express.Router();

// Crear nuevo horario
router.post("/", crearHorario);

// Obtener todos los horarios
router.get("/", obtenerHorarios);

// Obtener un horario por ID
router.get("/:id", obtenerHorario);

// Actualizar un horario existente
router.put("/:id", actualizarHorario);

// Eliminar un horario
router.delete("/:id", eliminarHorario);

export default router;
