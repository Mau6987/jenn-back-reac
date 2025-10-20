import express from "express";
import {
  iniciarPrueba,
  finalizarPrueba,
  obtenerPruebas,
  obtenerPruebasPorUsuario,
  eliminarPrueba
} from "../controllers/pruebaController.js";

const router = express.Router();

// Iniciar prueba
router.post("/iniciar", iniciarPrueba);

// Finalizar prueba
router.put("/finalizar/:id", finalizarPrueba);

// Obtener todas las pruebas
router.get("/", obtenerPruebas);

// Obtener pruebas por jugador
router.get("/usuario/:cuentaId", obtenerPruebasPorUsuario);

// Eliminar prueba
router.delete("/:id", eliminarPrueba);

export default router;
