// controllers/alcanceController.js
import { Alcance } from "../models/Alcance.js"
import { Cuenta } from "../models/Cuenta.js"
import { Jugador } from "../models/Jugador.js"
import { Entrenador } from "../models/Entrenador.js"
import { Tecnico } from "../models/Tecnico.js"

// Iniciar alcance
export const iniciarAlcance = async (req, res) => {
  try {
    const { cuentaId } = req.body
    if (!cuentaId) return res.status(400).json({ success: false, message: "cuentaId es requerido" })

    const nuevoAlcance = await Alcance.create({
      cuentaId,
      tiempodevuelo: 0,
      potencia: 0,
      velocidad: 0,
      alcance: 0,
      fecha: new Date(),
      estado: "en_curso",
    })

    res.json({ success: true, data: nuevoAlcance, message: "Alcance iniciado" })
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, message: "Error al iniciar alcance", error: error.message })
  }
}

// Finalizar alcance
export const finalizarAlcance = async (req, res) => {
  try {
    const { id } = req.params
    const { tiempodevuelo, potencia, velocidad, alcance } = req.body

    const alcanceRegistro = await Alcance.findByPk(id)
    if (!alcanceRegistro) return res.status(404).json({ success: false, message: "Alcance no encontrado" })

    await alcanceRegistro.update({
      tiempodevuelo,
      potencia,
      velocidad,
      alcance,
      estado: "finalizada",
    })

    res.json({ success: true, data: alcanceRegistro, message: "Alcance finalizado correctamente" })
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, message: "Error al finalizar alcance", error: error.message })
  }
}

// Obtener todos los alcances finalizados
export const obtenerAlcances = async (req, res) => {
  try {
    const alcances = await Alcance.findAll({
      where: { estado: "finalizada" },
      include: [
        {
          model: Cuenta,
          as: "cuenta",
          attributes: { exclude: ["contraseña", "token"] },
          include: [
            { model: Jugador, as: "jugador", attributes: ["nombres", "apellidos"] },
            { model: Entrenador, as: "entrenador", attributes: ["nombres", "apellidos"] },
            { model: Tecnico, as: "tecnico", attributes: ["nombres", "apellidos"] },
          ],
        },
      ],
      order: [["fecha", "DESC"]],
    })

    const alcancesFormateados = alcances.map((alcance) => {
      const nombre =
        alcance.cuenta.rol === "jugador"
          ? `${alcance.cuenta.jugador.nombres} ${alcance.cuenta.jugador.apellidos}`
          : alcance.cuenta.rol === "entrenador"
            ? `${alcance.cuenta.entrenador.nombres} ${alcance.cuenta.entrenador.apellidos}`
            : `${alcance.cuenta.tecnico.nombres} ${alcance.cuenta.tecnico.apellidos}`

      return {
        id: alcance.id,
        tiempodevuelo: alcance.tiempodevuelo,
        potencia: alcance.potencia,
        velocidad: alcance.velocidad,
        alcance: alcance.alcance,
        fecha: alcance.fecha,
        jugador: nombre,
      }
    })

    res.json({ success: true, data: alcancesFormateados })
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, message: "Error al obtener alcances", error: error.message })
  }
}

// Obtener alcances por usuario
export const obtenerAlcancesPorUsuario = async (req, res) => {
  try {
    const { cuentaId } = req.params

    const alcances = await Alcance.findAll({
      where: { cuentaId, estado: "finalizada" },
      include: [
        {
          model: Cuenta,
          as: "cuenta",
          attributes: { exclude: ["contraseña", "token"] },
          include: [
            { model: Jugador, as: "jugador", attributes: ["nombres", "apellidos"] },
            { model: Entrenador, as: "entrenador", attributes: ["nombres", "apellidos"] },
            { model: Tecnico, as: "tecnico", attributes: ["nombres", "apellidos"] },
          ],
        },
      ],
      order: [["fecha", "DESC"]],
    })

    const alcancesFormateados = alcances.map((alcance) => {
      const nombre =
        alcance.cuenta.rol === "jugador"
          ? `${alcance.cuenta.jugador.nombres} ${alcance.cuenta.jugador.apellidos}`
          : alcance.cuenta.rol === "entrenador"
            ? `${alcance.cuenta.entrenador.nombres} ${alcance.cuenta.entrenador.apellidos}`
            : `${alcance.cuenta.tecnico.nombres} ${alcance.cuenta.tecnico.apellidos}`

      return {
        id: alcance.id,
        tiempodevuelo: alcance.tiempodevuelo,
        potencia: alcance.potencia,
        velocidad: alcance.velocidad,
        alcance: alcance.alcance,
        fecha: alcance.fecha,
        jugador: nombre,
      }
    })

    res.json({ success: true, data: alcancesFormateados })
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, message: "Error al obtener alcances por usuario", error: error.message })
  }
}

// Eliminar alcance
export const eliminarAlcance = async (req, res) => {
  try {
    const { id } = req.params
    const alcance = await Alcance.findByPk(id)
    if (!alcance) return res.status(404).json({ success: false, message: "Alcance no encontrado" })

    await alcance.destroy()
    res.json({ success: true, message: "Alcance eliminado correctamente" })
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, message: "Error al eliminar alcance", error: error.message })
  }
}
