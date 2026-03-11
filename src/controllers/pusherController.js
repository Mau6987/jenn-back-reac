// controllers/pusherController.js
import Pusher from 'pusher';

// ─── Instancia A ──────────────────────────────────────────────────────────────
const pusherA = new Pusher({
  appId:   '1978430',
  key:     '4f85ef5c792df94cebc9',
  secret:  '351840445857a008668f',
  cluster: 'us2',
  useTLS:  true,
});

// ─── Instancia B ──────────────────────────────────────────────────────────────
const pusherB = new Pusher({
  appId:   '2125650',
  key:     '069e235fe8764addd340',
  secret:  'a444ceabdb6e0a8d409d',
  cluster: 'us2',
  useTLS:  true,
});

// ─── Auth A ───────────────────────────────────────────────────────────────────
export const pusherAuth = (req, res) => {
  const { socket_id, channel_name } = req.body;

  if (!socket_id || !channel_name)
    return res.status(400).json({ error: 'Faltan parámetros' });

  try {
    const auth = pusherA.authenticate(socket_id, channel_name);
    res.json(auth);
  } catch (error) {
    console.error('Error autenticando Pusher A:', error);
    res.status(500).json({ error: 'Error autenticando Pusher' });
  }
};

// ─── Auth B ───────────────────────────────────────────────────────────────────
export const pusherAuthB = (req, res) => {
  const { socket_id, channel_name } = req.body;

  if (!socket_id || !channel_name)
    return res.status(400).json({ error: 'Faltan parámetros' });

  try {
    const auth = pusherB.authenticate(socket_id, channel_name);
    res.json(auth);
  } catch (error) {
    console.error('Error autenticando Pusher B:', error);
    res.status(500).json({ error: 'Error autenticando Pusher' });
  }
};

// ─── Test de conexión ─────────────────────────────────────────────────────────
export const testConnection = (req, res) => {
  res.json({
    success:   true,
    message:   'Conexión exitosa desde ESP32',
    timestamp: new Date().toISOString(),
    device:    'ESP32',
  });
};

// ─── Send Command A ───────────────────────────────────────────────────────────
export const sendCommand = async (req, res) => {
  try {
    const { deviceId, command } = req.body;

    if (!deviceId || !command)
      return res.status(400).json({ error: 'Faltan parámetros' });

    await pusherA.trigger(`private-device-${deviceId}`, 'client-command', {
      command,
      from: 'server',
    });

    res.json({ success: true, message: `Comando '${command}' enviado al dispositivo ${deviceId}` });
  } catch (error) {
    console.error('Error enviando comando A:', error);
    res.status(500).json({ error: 'Error enviando comando' });
  }
};

// ─── Send Command B ───────────────────────────────────────────────────────────
export const sendCommandB = async (req, res) => {
  try {
    const { deviceId, command } = req.body;

    if (!deviceId || !command)
      return res.status(400).json({ error: 'Faltan parámetros' });

    await pusherB.trigger(`private-device-${deviceId}`, 'client-command', {
      command,
      from: 'server',
    });

    res.json({ success: true, message: `Comando '${command}' enviado al dispositivo ${deviceId}` });
  } catch (error) {
    console.error('Error enviando comando B:', error);
    res.status(500).json({ error: 'Error enviando comando' });
  }
};