// routes/saltoRoutes.js
import express from "express"
import {
  iniciarSalto,
  finalizarSalto,
  obtenerSaltos,
  obtenerSaltosPorUsuario,
  eliminarSalto,
} from "../controllers/Saltocontroller.js"

const router = express.Router()

router.post("/iniciar", iniciarSalto)
router.put("/finalizar/:id", finalizarSalto)
router.get("/", obtenerSaltos)
router.get("/usuario/:cuentaId", obtenerSaltosPorUsuario)
router.delete("/:id", eliminarSalto)

export default router