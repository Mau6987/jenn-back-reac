// routes/espRoutes.js
import express from "express";
import { sendCommand, pusherAuth, testConnection} from "../controllers/pusherController.js";

const router = express.Router();

// Y agrega la ruta en tus routes:
router.get('/test', testConnection);
router.post("/send-command", sendCommand);
router.post('/pusher/auth', pusherAuth);
export default router;