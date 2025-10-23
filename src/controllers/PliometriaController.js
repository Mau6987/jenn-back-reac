// controllers/pliometriaController.js
import { Pliometria } from "../models/Pliometria.js"
import { Cuenta } from "../models/Cuenta.js"
import { Jugador } from "../models/Jugador.js"
import { Entrenador } from "../models/Entrenador.js"
import { Tecnico } from "../models/Tecnico.js"

// Iniciar pliometría
export const iniciarPliometria = async (req, res) => {
  try {
    const { cuentaId, tipo } = req.body
    if (!cuentaId || !tipo)
      return res.status(400).json({ success: false, message: "cuentaId y tipo son requeridos" })

    const TIPOS = ["salto cajon", "salto simple", "salto valla"]
    if (!TIPOS.includes(tipo))
      return res.status(400).json({ success: false, message: `tipo inválido. Permitidos: ${TIPOS.join(", ")}` })

    const nuevaPliometria = await Pliometria.create({
      cuentaId,
      tipo,
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

// Finalizar pliometría (sin cambios de campos)
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

// Listados: incluir `tipo` y eliminar `movimiento`
export const obtenerPliometrias = async (req, res) => {
  try {
    const pliometrias = await Pliometria.findAll({
      where: { estado: "finalizada" },
      include: [{
        model: Cuenta, as: "cuenta", attributes: { exclude: ["contraseña", "token"] },
        include: [
          { model: Jugador, as: "jugador", attributes: ["nombres", "apellidos"] },
          { model: Entrenador, as: "entrenador", attributes: ["nombres", "apellidos"] },
          { model: Tecnico, as: "tecnico", attributes: ["nombres", "apellidos"] },
        ],
      }],
      order: [["fecha", "DESC"]],
    })

    const data = pliometrias.map((plio) => {
      const nombre =
        plio.cuenta.rol === "jugador"
          ? `${plio.cuenta.jugador?.nombres ?? ""} ${plio.cuenta.jugador?.apellidos ?? ""}`.trim()
          : plio.cuenta.rol === "entrenador"
            ? `${plio.cuenta.entrenador?.nombres ?? ""} ${plio.cuenta.entrenador?.apellidos ?? ""}`.trim()
            : `${plio.cuenta.tecnico?.nombres ?? ""} ${plio.cuenta.tecnico?.apellidos ?? ""}`.trim()

      return {
        id: plio.id,
        tipo: plio.tipo,
        fuerzaizquierda: plio.fuerzaizquierda,
        fuerzaderecha: plio.fuerzaderecha,
        aceleracion: plio.aceleracion,
        potencia: plio.potencia,
        fecha: plio.fecha,
        jugador: nombre,
      }
    })

    res.json({ success: true, data })
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, message: "Error al obtener pliometrías", error: error.message })
  }
}

export const obtenerPliometriasPorUsuario = async (req, res) => {
  try {
    const { cuentaId } = req.params
    const pliometrias = await Pliometria.findAll({
      where: { cuentaId, estado: "finalizada" },
      include: [{
        model: Cuenta, as: "cuenta", attributes: { exclude: ["contraseña", "token"] },
        include: [
          { model: Jugador, as: "jugador", attributes: ["nombres", "apellidos"] },
          { model: Entrenador, as: "entrenador", attributes: ["nombres", "apellidos"] },
          { model: Tecnico, as: "tecnico", attributes: ["nombres", "apellidos"] },
        ],
      }],
      order: [["fecha", "DESC"]],
    })

    const data = pliometrias.map((plio) => {
      const nombre =
        plio.cuenta.rol === "jugador"
          ? `${plio.cuenta.jugador?.nombres ?? ""} ${plio.cuenta.jugador?.apellidos ?? ""}`.trim()
          : plio.cuenta.rol === "entrenador"
            ? `${plio.cuenta.entrenador?.nombres ?? ""} ${plio.cuenta.entrenador?.apellidos ?? ""}`.trim()
            : `${plio.cuenta.tecnico?.nombres ?? ""} ${plio.cuenta.tecnico?.apellidos ?? ""}`.trim()

      return {
        id: plio.id,
        tipo: plio.tipo,
        fuerzaizquierda: plio.fuerzaizquierda,
        fuerzaderecha: plio.fuerzaderecha,
        aceleracion: plio.aceleracion,
        potencia: plio.potencia,
        fecha: plio.fecha,
        jugador: nombre,
      }
    })

    res.json({ success: true, data })
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
