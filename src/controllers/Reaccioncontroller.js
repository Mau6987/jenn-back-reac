import { Reaccion } from "../models/Reaccion.js"
import { Cuenta } from "../models/Cuenta.js"
import { Jugador } from "../models/Jugador.js"
import { Entrenador } from "../models/Entrenador.js"
import { Tecnico } from "../models/Tecnico.js"
import Pusher from "pusher"

const pusher = new Pusher({
  appId: "1978430",
  key: "4f85ef5c792df94cebc9",
  secret: "351840445857a008668f",
  cluster: "us2",
  useTLS: true,
})

// Función para enviar comando a dispositivos con deviceIds con prefijo "ESP-"
const enviarComandoATodos = async (comando, deviceIds = ["ESP-1", "ESP-2", "ESP-3", "ESP-4", "ESP-5"], userId = "sistema") => {
  for (const id of deviceIds) {
    const channel = `private-device-${id}`
    await pusher.trigger(channel, "client-command", {
      command: comando,
      from: userId,
      timestamp: new Date().toISOString(),
    })
    console.log(`Comando "${comando}" enviado a ${id} por usuario ${userId}`)
  }
}

export const sendCommand = async (req, res) => {
  try {
    const { deviceId, command } = req.body

    if (!deviceId || !command) {
      return res.status(400).json({ error: "Faltan parámetros" })
    }

    const normalizedDeviceId = deviceId.startsWith("ESP-") ? deviceId : `ESP-${deviceId}`
    const channel = `private-device-${normalizedDeviceId}`

    await pusher.trigger(channel, "client-command", {
      command: command,
      from: "server",
    })

    res.json({ success: true, message: `Comando '${command}' enviado al dispositivo ${normalizedDeviceId}` })
  } catch (error) {
    console.error("Error enviando comando:", error)
    res.status(500).json({ error: "Error enviando comando" })
  }
}

// ------------------ CONTROLADORES ------------------ //

// Iniciar reacción
export const iniciarReaccion = async (req, res) => {
  try {
    const { tipo, cuentaId } = req.body
    if (!tipo || !cuentaId)
      return res.status(400).json({ success: false, message: "Tipo de reacción y cuentaId son requeridos" })

    const nuevaReaccion = await Reaccion.create({
      tipo,
      cuentaId,
      tiempo_inicio: new Date(),
      fecha: new Date(),
      estado: "en_curso",
    })

    res.json({ success: true, data: nuevaReaccion, message: "Reacción iniciada" })
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, message: "Error al iniciar la reacción", error: error.message })
  }
}

// Finalizar reacción
export const finalizarReaccion = async (req, res) => {
  try {
    const { id } = req.params
    const datos = req.body

    const reaccion = await Reaccion.findByPk(id)
    if (!reaccion)
      return res.status(404).json({ success: false, message: "Reacción no encontrada" })

    if (reaccion.tipo === "secuencial" || reaccion.tipo === "manual") {
      datos.tiempo_fin = datos.tiempo_fin || new Date()
    }

    await reaccion.update({ ...datos, estado: "finalizada" })

    res.json({ success: true, data: reaccion, message: "Reacción finalizada correctamente" })
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, message: "Error al finalizar la reacción", error: error.message })
  }
}

// Obtener todas las reacciones finalizadas
export const obtenerReacciones = async (req, res) => {
  try {
    const reacciones = await Reaccion.findAll({
      where: { estado: "finalizada" },
      include: [
        {
          model: Cuenta,
          as: "cuenta",
          attributes: { exclude: ["contraseña", "token"] },
          include: [
            { model: Jugador,    as: "jugador",    attributes: ["nombres", "apellidos"] },
            { model: Entrenador, as: "entrenador", attributes: ["nombres", "apellidos"] },
            { model: Tecnico,    as: "tecnico",    attributes: ["nombres", "apellidos"] },
          ],
        },
      ],
      order: [["tiempo_fin", "DESC"]],
    })

    const reaccionesFormateadas = reacciones.map((reaccion) => {
      const { tipo, tiempo_inicio, tiempo_fin, cantidad_aciertos, cantidad_errores, fecha } = reaccion
      const nombre =
        reaccion.cuenta.rol === "jugador"
          ? `${reaccion.cuenta.jugador.nombres} ${reaccion.cuenta.jugador.apellidos}`
          : reaccion.cuenta.rol === "entrenador"
            ? `${reaccion.cuenta.entrenador.nombres} ${reaccion.cuenta.entrenador.apellidos}`
            : `${reaccion.cuenta.tecnico.nombres} ${reaccion.cuenta.tecnico.apellidos}`

      return {
        id: reaccion.id,
        tipo,
        fecha,
        tiempo_inicio,
        tiempo_fin,
        cantidad_aciertos,
        cantidad_errores,
        jugador: nombre,
      }
    })

    res.json({ success: true, data: reaccionesFormateadas })
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, message: "Error al obtener reacciones", error: error.message })
  }
}

// Obtener reacciones finalizadas por usuario
export const obtenerReaccionesPorUsuario = async (req, res) => {
  try {
    const { cuentaId } = req.params

    const reacciones = await Reaccion.findAll({
      where: { cuentaId, estado: "finalizada" },
      include: [
        {
          model: Cuenta,
          as: "cuenta",
          attributes: { exclude: ["contraseña", "token"] },
          include: [
            { model: Jugador,    as: "jugador",    attributes: ["nombres", "apellidos"] },
            { model: Entrenador, as: "entrenador", attributes: ["nombres", "apellidos"] },
            { model: Tecnico,    as: "tecnico",    attributes: ["nombres", "apellidos"] },
          ],
        },
      ],
      order: [["tiempo_fin", "DESC"]],
    })

    const reaccionesFormateadas = reacciones.map((reaccion) => {
      const { tipo, tiempo_inicio, tiempo_fin, cantidad_aciertos, cantidad_errores, fecha } = reaccion
      const nombre =
        reaccion.cuenta.rol === "jugador"
          ? `${reaccion.cuenta.jugador.nombres} ${reaccion.cuenta.jugador.apellidos}`
          : reaccion.cuenta.rol === "entrenador"
            ? `${reaccion.cuenta.entrenador.nombres} ${reaccion.cuenta.entrenador.apellidos}`
            : `${reaccion.cuenta.tecnico.nombres} ${reaccion.cuenta.tecnico.apellidos}`

      return {
        id: reaccion.id,
        tipo,
        fecha,
        tiempo_inicio,
        tiempo_fin,
        cantidad_aciertos,
        cantidad_errores,
        jugador: nombre,
      }
    })

    res.json({ success: true, data: reaccionesFormateadas })
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, message: "Error al obtener reacciones por usuario", error: error.message })
  }
}

// Eliminar reacción
export const eliminarReaccion = async (req, res) => {
  try {
    const { id } = req.params
    const reaccion = await Reaccion.findByPk(id)
    if (!reaccion)
      return res.status(404).json({ success: false, message: "Reacción no encontrada" })

    await reaccion.destroy()
    res.json({ success: true, message: "Reacción eliminada correctamente" })
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, message: "Error al eliminar reacción", error: error.message })
  }
}