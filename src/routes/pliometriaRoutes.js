// routes/pliometriaActualizadaRoutes.js
import express from "express"
import {
  iniciarPliometria,
  finalizarPliometria,
  obtenerPliometrias,
  obtenerPliometriasPorUsuario,
  eliminarPliometria,
} from "../controllers/PliometriaController.js"

const router = express.Router()

router.post("/iniciar", iniciarPliometria)
router.put("/finalizar/:id", finalizarPliometria)
router.get("/", obtenerPliometrias)
router.get("/usuario/:cuentaId", obtenerPliometriasPorUsuario)
router.delete("/:id", eliminarPliometria)

export default router
