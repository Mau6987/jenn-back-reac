// controllers/pusherController.js
import Pusher from 'pusher';


const pusher = new Pusher({
  appId: '1978430',
  key: '4f85ef5c792df94cebc9',
  secret: '351840445857a008668f',
  cluster: 'us2',
  useTLS: true
});

// Controlador para autenticar suscripción a canal privado
export const pusherAuth = (req, res) => {
  const { socket_id, channel_name } = req.body;

  if (!socket_id || !channel_name) {
    return res.status(400).json({ error: 'Faltan parámetros' });
  }

  try {
    const auth = pusher.authenticate(socket_id, channel_name);
    res.json(auth);
  } catch (error) {
    console.error('Error autenticando Pusher:', error);
    res.status(500).json({ error: 'Error autenticando Pusher' });
  }
};
// Agrega esto a tu controllers/pusherController.js
export const testConnection = (req, res) => {
  res.json({ 
    success: true,
    message: "Conexión exitosa desde ESP32",
    timestamp: new Date().toISOString(),
    device: "ESP32"
  });
};


// Controlador para enviar comando al dispositivo vía Pusher
export const sendCommand = async (req, res) => {
  try {
    const { deviceId, command } = req.body;

    if (!deviceId || !command) {
      return res.status(400).json({ error: 'Faltan parámetros' });
    }

    const channel = `private-device-${deviceId}`;

    await pusher.trigger(channel, 'client-command', {
      command: command,
      from: 'server'
    });

    res.json({ success: true, message: `Comando '${command}' enviado al dispositivo ${deviceId}` });
  } catch (error) {
    console.error('Error enviando comando:', error);
    res.status(500).json({ error: 'Error enviando comando' });
  }
};
