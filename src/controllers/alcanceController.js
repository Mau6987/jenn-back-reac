// controllers/alcanceController.js
import { Alcance } from "../models/Alcance.js"
import { Cuenta } from "../models/Cuenta.js"
import { Jugador } from "../models/Jugador.js"
import { Entrenador } from "../models/Entrenador.js"
import { Tecnico } from "../models/Tecnico.js"

// Guardar alcance (único endpoint necesario)
export const guardarAlcance = async (req, res) => {
  try {
    const { cuentaId, alcance } = req.body
    if (!cuentaId || alcance === undefined)
      return res.status(400).json({ success: false, message: "cuentaId y alcance son requeridos" })

    const nuevoAlcance = await Alcance.create({
      cuentaId,
      alcance,
      fecha: new Date(),
    })

    res.json({ success: true, data: nuevoAlcance, message: "Alcance guardado" })
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, message: "Error al guardar alcance", error: error.message })
  }
}

// Obtener el último alcance de un jugador
export const obtenerUltimoAlcance = async (req, res) => {
  try {
    const { cuentaId } = req.params

    const ultimo = await Alcance.findOne({
      where: { cuentaId },
      order: [["fecha", "DESC"]],
    })

    res.json({ success: true, data: ultimo })
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, message: "Error al obtener último alcance", error: error.message })
  }
}

// Obtener todos los alcances
export const obtenerAlcances = async (req, res) => {
  try {
    const alcances = await Alcance.findAll({
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

    const formateados = alcances.map((a) => {
      const cuenta = a.cuenta
      const nombre =
        cuenta.rol === "jugador"
          ? `${cuenta.jugador.nombres} ${cuenta.jugador.apellidos}`
          : cuenta.rol === "entrenador"
          ? `${cuenta.entrenador.nombres} ${cuenta.entrenador.apellidos}`
          : `${cuenta.tecnico.nombres} ${cuenta.tecnico.apellidos}`
      return { id: a.id, alcance: a.alcance, fecha: a.fecha, jugador: nombre }
    })

    res.json({ success: true, data: formateados })
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
      where: { cuentaId },
      order: [["fecha", "DESC"]],
    })
    res.json({ success: true, data: alcances })
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