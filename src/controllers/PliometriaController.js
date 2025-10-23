// controllers/pliometriaActualizadaController.js
import { Pliometria } from "../models/Pliometria.js"
import { Cuenta } from "../models/Cuenta.js"
import { Jugador } from "../models/Jugador.js"
import { Entrenador } from "../models/Entrenador.js"
import { Tecnico } from "../models/Tecnico.js"

// Iniciar pliometría
export const iniciarPliometria = async (req, res) => {
  try {
    const { cuentaId, movimiento } = req.body
    if (!cuentaId || !movimiento)
      return res.status(400).json({ success: false, message: "cuentaId y movimiento son requeridos" })

    const nuevaPliometria = await Pliometria.create({
      cuentaId,
      movimiento,
      fuerzaizquierda: 0,
      fuerzaderecha: 0,
      aceleracion: 0,
      potencia: 0,
      fecha: new Date(),
      estado: "en_curso",
    })

    res.json({ success: true, data: nuevaPliometria, message: "Pliometría iniciada" })
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, message: "Error al iniciar pliometría", error: error.message })
  }
}

// Finalizar pliometría
export const finalizarPliometria = async (req, res) => {
  try {
    const { id } = req.params
    const { fuerzaizquierda, fuerzaderecha, aceleracion, potencia } = req.body

    const pliometria = await Pliometria.findByPk(id)
    if (!pliometria) return res.status(404).json({ success: false, message: "Pliometría no encontrada" })

    await pliometria.update({
      fuerzaizquierda,
      fuerzaderecha,
      aceleracion,
      potencia,
      estado: "finalizada",
    })

    res.json({ success: true, data: pliometria, message: "Pliometría finalizada correctamente" })
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, message: "Error al finalizar pliometría", error: error.message })
  }
}

// Obtener todas las pliometrías finalizadas
export const obtenerPliometrias = async (req, res) => {
  try {
    const pliometrias = await Pliometria.findAll({
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

    const pliometriasFormateadas = pliometrias.map((plio) => {
      const nombre =
        plio.cuenta.rol === "jugador"
          ? `${plio.cuenta.jugador.nombres} ${plio.cuenta.jugador.apellidos}`
          : plio.cuenta.rol === "entrenador"
            ? `${plio.cuenta.entrenador.nombres} ${plio.cuenta.entrenador.apellidos}`
            : `${plio.cuenta.tecnico.nombres} ${plio.cuenta.tecnico.apellidos}`

      return {
        id: plio.id,
        fuerzaizquierda: plio.fuerzaizquierda,
        fuerzaderecha: plio.fuerzaderecha,
        aceleracion: plio.aceleracion,
        potencia: plio.potencia,
        movimiento: plio.movimiento,
        fecha: plio.fecha,
        jugador: nombre,
      }
    })

    res.json({ success: true, data: pliometriasFormateadas })
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, message: "Error al obtener pliometrías", error: error.message })
  }
}

// Obtener pliometrías por usuario
export const obtenerPliometriasPorUsuario = async (req, res) => {
  try {
    const { cuentaId } = req.params

    const pliometrias = await Pliometria.findAll({
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

    const pliometriasFormateadas = pliometrias.map((plio) => {
      const nombre =
        plio.cuenta.rol === "jugador"
          ? `${plio.cuenta.jugador.nombres} ${plio.cuenta.jugador.apellidos}`
          : plio.cuenta.rol === "entrenador"
            ? `${plio.cuenta.entrenador.nombres} ${plio.cuenta.entrenador.apellidos}`
            : `${plio.cuenta.tecnico.nombres} ${plio.cuenta.tecnico.apellidos}`

      return {
        id: plio.id,
        fuerzaizquierda: plio.fuerzaizquierda,
        fuerzaderecha: plio.fuerzaderecha,
        aceleracion: plio.aceleracion,
        potencia: plio.potencia,
        movimiento: plio.movimiento,
        fecha: plio.fecha,
        jugador: nombre,
      }
    })

    res.json({ success: true, data: pliometriasFormateadas })
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, message: "Error al obtener pliometrías por usuario", error: error.message })
  }
}

// Eliminar pliometría
export const eliminarPliometria = async (req, res) => {
  try {
    const { id } = req.params
    const pliometria = await Pliometria.findByPk(id)
    if (!pliometria) return res.status(404).json({ success: false, message: "Pliometría no encontrada" })

    await pliometria.destroy()
    res.json({ success: true, message: "Pliometría eliminada correctamente" })
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, message: "Error al eliminar pliometría", error: error.message })
  }
}
