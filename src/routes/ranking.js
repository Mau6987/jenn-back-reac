// routes/rankingRoutes.js
import express from "express";
import { 
  rankingPersonal, 
  rankingGeneral, 
  rankingPersonalFiltrado, 
  rankingGeneralFiltrado 
} from "../controllers/rankingController.js";

const router = express.Router();

// 📌 Ranking personal (por cuentaId, últimos 7 días)
router.get("/personal/:cuentaId", rankingPersonal);

// 📌 Ranking general (todos los jugadores, últimos 7 días)
router.get("/general", rankingGeneral);

// 📌 Ranking personal con filtros (POST con body JSON)
router.post("/personal/filtros", rankingPersonalFiltrado);


// 📌 Ranking general con filtros (POST con body JSON)
router.post("/general/filtros", rankingGeneralFiltrado);

export default router;
