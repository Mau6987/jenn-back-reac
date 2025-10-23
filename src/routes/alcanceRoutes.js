// routes/alcanceRoutes.js
import express from "express"
import {
  iniciarAlcance,
  finalizarAlcance,
  obtenerAlcances,
  obtenerAlcancesPorUsuario,
  eliminarAlcance,
} from "../controllers/alcanceController.js"

const router = express.Router()

router.post("/iniciar", iniciarAlcance)
router.put("/finalizar/:id", finalizarAlcance)
router.get("/", obtenerAlcances)
router.get("/usuario/:cuentaId", obtenerAlcancesPorUsuario)
router.delete("/:id", eliminarAlcance)

export default router
