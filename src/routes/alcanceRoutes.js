// routes/alcanceRoutes.js
import express from "express"
import {
  guardarAlcance,
  obtenerUltimoAlcance,
  obtenerAlcances,
  obtenerAlcancesPorUsuario,
  eliminarAlcance,
} from "../controllers/alcanceController.js"

const router = express.Router()

router.post("/", guardarAlcance)
router.get("/", obtenerAlcances)
router.get("/ultimo/:cuentaId", obtenerUltimoAlcance)   // <-- nuevo
router.get("/usuario/:cuentaId", obtenerAlcancesPorUsuario)
router.delete("/:id", eliminarAlcance)

export default router