// controllers/pliometriaController.js
import { Pliometria } from "../models/Pliometria.js"
import { Cuenta } from "../models/Cuenta.js"
import { Jugador } from "../models/Jugador.js"
import { Entrenador } from "../models/Entrenador.js"
import { Tecnico } from "../models/Tecnico.js"

export const iniciarPliometria = async (req, res) => {
  try {
    const { cuentaId, tipo, tiempo } = req.body
    if (!cuentaId || !tipo)
      return res.status(400).json({ success: false, message: "cuentaId y tipo son requeridos" })

    const TIPOS = ["salto cajon", "salto simple", "salto valla"]
    if (!TIPOS.includes(tipo))
      return res.status(400).json({ success: false, message: `tipo inválido. Permitidos: ${TIPOS.join(", ")}` })

    const nuevaPliometria = await Pliometria.create({
      cuentaId,
      tipo,
      tiempo:          tiempo || 0,
      fuerzaizquierda: 0,
      fuerzaderecha:   0,
      aceleracion:     0,
      potencia:        0,
      cantidad_saltos: 0,
      indice_fatiga:   0,
      altura_promedio: 0,
      fecha:           new Date(),
      estado:          "en_curso",
    })

    res.json({ success: true, data: nuevaPliometria, message: "Pliometría iniciada" })
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, message: "Error al iniciar pliometría", error: error.message })
  }
}

export const finalizarPliometria = async (req, res) => {
  try {
    const { id } = req.params
    const {
      fuerzaizquierda,
      fuerzaderecha,
      aceleracion,
      potencia,
      cantidad_saltos,
      indice_fatiga,
      altura_promedio,
    } = req.body

    const pliometria = await Pliometria.findByPk(id)
    if (!pliometria)
      return res.status(404).json({ success: false, message: "Pliometría no encontrada" })

    await pliometria.update({
      fuerzaizquierda: fuerzaizquierda ?? pliometria.fuerzaizquierda,
      fuerzaderecha:   fuerzaderecha   ?? pliometria.fuerzaderecha,
      aceleracion:     aceleracion     ?? pliometria.aceleracion,
      potencia:        potencia        ?? pliometria.potencia,
      cantidad_saltos: cantidad_saltos ?? pliometria.cantidad_saltos,
      indice_fatiga:   indice_fatiga   ?? pliometria.indice_fatiga,
      altura_promedio: altura_promedio ?? pliometria.altura_promedio,
      estado:          "finalizada",
    })

    res.json({ success: true, data: pliometria, message: "Pliometría finalizada correctamente" })
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, message: "Error al finalizar pliometría", error: error.message })
  }
}

// Helper para construir nombre según rol
const getNombre = (cuenta) => {
  if (cuenta.rol === "jugador")
    return `${cuenta.jugador?.nombres ?? ""} ${cuenta.jugador?.apellidos ?? ""}`.trim()
  if (cuenta.rol === "entrenador")
    return `${cuenta.entrenador?.nombres ?? ""} ${cuenta.entrenador?.apellidos ?? ""}`.trim()
  return `${cuenta.tecnico?.nombres ?? ""} ${cuenta.tecnico?.apellidos ?? ""}`.trim()
}

const mapPlio = (plio) => ({
  id:              plio.id,
  tipo:            plio.tipo,
  tiempo:          plio.tiempo,
  fuerzaizquierda: plio.fuerzaizquierda,
  fuerzaderecha:   plio.fuerzaderecha,
  aceleracion:     plio.aceleracion,
  potencia:        plio.potencia,
  cantidad_saltos: plio.cantidad_saltos,
  indice_fatiga:   plio.indice_fatiga,
  altura_promedio: plio.altura_promedio,
  fecha:           plio.fecha,
  jugador:         getNombre(plio.cuenta),
})

const includesCuenta = [
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
]

export const obtenerPliometrias = async (req, res) => {
  try {
    const pliometrias = await Pliometria.findAll({
      where: { estado: "finalizada" },
      include: includesCuenta,
      order: [["fecha", "DESC"]],
    })
    res.json({ success: true, data: pliometrias.map(mapPlio) })
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
      include: includesCuenta,
      order: [["fecha", "DESC"]],
    })
    res.json({ success: true, data: pliometrias.map(mapPlio) })
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, message: "Error al obtener pliometrías por usuario", error: error.message })
  }
}

export const eliminarPliometria = async (req, res) => {
  try {
    const { id } = req.params
    const pliometria = await Pliometria.findByPk(id)
    if (!pliometria)
      return res.status(404).json({ success: false, message: "Pliometría no encontrada" })

    await pliometria.destroy()
    res.json({ success: true, message: "Pliometría eliminada correctamente" })
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, message: "Error al eliminar pliometría", error: error.message })
  }
}