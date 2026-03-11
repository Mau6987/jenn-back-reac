// routes/pusherRoutes.js
import express from 'express';
import {
  pusherAuth,
  pusherAuthB,
  testConnection,
  sendCommand,
  sendCommandB,
} from '../controllers/pusherController.js';

const router = express.Router();

// ─── Instancia A ──────────────────────────────────────────────────────────────
router.post('/pusher/auth',    pusherAuth);
router.post('/send-command',   sendCommand);

// ─── Instancia B ──────────────────────────────────────────────────────────────
router.post('/pusher/auth-b',  pusherAuthB);
router.post('/send-command-b', sendCommandB);

// ─── General ──────────────────────────────────────────────────────────────────
router.get('/test-connection', testConnection);

export default router;