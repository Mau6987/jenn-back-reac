// routes/pliometriaRoutes.js
import express from "express";
import {
  crearPliometria,
  iniciarPliometria,
  finalizarPliometria,
  obtenerPliometrias,
  obtenerPliometria,
  actualizarPliometria,
  eliminarPliometria
} from "../controllers/PliometriaController.js";

const router = express.Router();

// Crear nuevo registro de pliometría
router.post("/", crearPliometria);

// Iniciar pliometría (genera registro con valores por defecto)
router.post("/iniciar", iniciarPliometria);

// Finalizar pliometría (actualiza valores)
router.put("/finalizar/:id", finalizarPliometria);

// Obtener todos los registros
router.get("/", obtenerPliometrias);

// Obtener un registro por ID
router.get("/:id", obtenerPliometria);

// Actualizar un registro existente
router.put("/:id", actualizarPliometria);

// Eliminar un registro
router.delete("/:id", eliminarPliometria);

export default router;
