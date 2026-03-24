// routes/resultados.js
// Añade la ruta /personal/:cuentaId/sesiones al router existente.

import { Router } from "express"
import {
  obtenerResultadosPersonales,
  obtenerSesionesPersonales,   // ← nuevo
  obtenerResultadosGeneral,
  obtenerPosicionUsuario,
} from "../controllers/Resultadoscontroller.js"

const router = Router()

// ── Resultados agregados (KPIs, totales por tipo) ──
// GET /api/resultados/personal/:cuentaId?desde=&hasta=&periodo=
router.get("/personal/:cuentaId", obtenerResultadosPersonales)

// ── Sesiones individuales (tabla del frontend) ──
// GET /api/resultados/personal/:cuentaId/sesiones?desde=&hasta=&periodo=&tipo=
router.get("/personal/:cuentaId/sesiones", obtenerSesionesPersonales)

// ── Resultados general ──
// GET /api/resultados/general?desde=&hasta=&periodo=&posicion=&carrera=&limite=
router.get("/general", obtenerResultadosGeneral)

// ── Posición de un usuario en el resultados ──
// GET /api/resultados/posicion/:cuentaId?desde=&hasta=&periodo=&posicion=&carrera=
router.get("/posicion/:cuentaId", obtenerPosicionUsuario)

export default router