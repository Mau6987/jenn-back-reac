import { Router } from "express"
import {
  obtenerCabeceraPanel,
  obtenerDatosReaccionPanel,
  obtenerDatosSaltoPanel,
} from "../controllers/panelJugadoraController.js"

const router = Router()

// GET /api/panel/jugadora/:cuentaId
// Header del panel: nombre, posición, última prueba
router.get("/jugadora/:cuentaId", obtenerCabeceraPanel)

// GET /api/panel/jugadora/:cuentaId/reaccion
// Tab Reacción: KPIs + chart + tabla
// Query params opcionales: desde=YYYY-MM-DD, hasta=YYYY-MM-DD
router.get("/jugadora/:cuentaId/reaccion", obtenerDatosReaccionPanel)

// GET /api/panel/jugadora/:cuentaId/salto
// Tab Salto: KPIs + chart + tabla
// Query params opcionales: desde=YYYY-MM-DD, hasta=YYYY-MM-DD, tipo=salto simple|salto conos
router.get("/jugadora/:cuentaId/salto", obtenerDatosSaltoPanel)

export default router