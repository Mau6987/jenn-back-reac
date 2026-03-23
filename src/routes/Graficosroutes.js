// routes/graficosRoutes.js
import { Router } from "express"
import { evolucionGrupal, rankingGrupal, boxplotModos } from "../controllers/Graficoscontroller.js"

const router = Router()

// GET /api/graficos/evolucion-grupal   → Gráfico 1: líneas evolución semanal
// GET /api/graficos/ranking-grupal     → Gráfico 2: barras horizontales ranking
// GET /api/graficos/boxplot            → Gráfico 3: boxplot por modo

router.get("/evolucion-grupal", evolucionGrupal)
router.get("/ranking-grupal",   rankingGrupal)
router.get("/boxplot",          boxplotModos)

export default router