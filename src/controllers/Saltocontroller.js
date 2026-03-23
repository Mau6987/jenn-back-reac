// controllers/saltoController.js
import { Salto } from "../models/Salto.js"
import { Cuenta } from "../models/Cuenta.js"
import { Jugador } from "../models/Jugador.js"
import { Entrenador } from "../models/Entrenador.js"
import { Tecnico } from "../models/Tecnico.js"

const TIPOS_VALIDOS = ["salto simple", "salto conos"]

export const iniciarSalto = async (req, res) => {
  try {
    const { cuentaId, tipo, tiempo } = req.body
    if (!cuentaId || !tipo)
      return res.status(400).json({ success: false, message: "cuentaId y tipo son requeridos" })

    if (!TIPOS_VALIDOS.includes(tipo))
      return res.status(400).json({ success: false, message: `tipo inválido. Permitidos: ${TIPOS_VALIDOS.join(", ")}` })

    const nuevoSalto = await Salto.create({
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

    res.json({ success: true, data: nuevoSalto, message: "Salto iniciado" })
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, message: "Error al iniciar salto", error: error.message })
  }
}

export const finalizarSalto = async (req, res) => {
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

    const salto = await Salto.findByPk(id)
    if (!salto)
      return res.status(404).json({ success: false, message: "Salto no encontrado" })

    await salto.update({
      fuerzaizquierda: fuerzaizquierda ?? salto.fuerzaizquierda,
      fuerzaderecha:   fuerzaderecha   ?? salto.fuerzaderecha,
      aceleracion:     aceleracion     ?? salto.aceleracion,
      potencia:        potencia        ?? salto.potencia,
      cantidad_saltos: cantidad_saltos ?? salto.cantidad_saltos,
      indice_fatiga:   indice_fatiga   ?? salto.indice_fatiga,
      altura_promedio: altura_promedio ?? salto.altura_promedio,
      estado:          "finalizada",
    })

    res.json({ success: true, data: salto, message: "Salto finalizado correctamente" })
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, message: "Error al finalizar salto", error: error.message })
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

const mapSalto = (salto) => ({
  id:              salto.id,
  tipo:            salto.tipo,
  tiempo:          salto.tiempo,
  fuerzaizquierda: salto.fuerzaizquierda,
  fuerzaderecha:   salto.fuerzaderecha,
  aceleracion:     salto.aceleracion,
  potencia:        salto.potencia,
  cantidad_saltos: salto.cantidad_saltos,
  indice_fatiga:   salto.indice_fatiga,
  altura_promedio: salto.altura_promedio,
  fecha:           salto.fecha,
  jugador:         getNombre(salto.cuenta),
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

export const obtenerSaltos = async (req, res) => {
  try {
    const saltos = await Salto.findAll({
      where: { estado: "finalizada" },
      include: includesCuenta,
      order: [["fecha", "DESC"]],
    })
    res.json({ success: true, data: saltos.map(mapSalto) })
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, message: "Error al obtener saltos", error: error.message })
  }
}

export const obtenerSaltosPorUsuario = async (req, res) => {
  try {
    const { cuentaId } = req.params
    const saltos = await Salto.findAll({
      where: { cuentaId, estado: "finalizada" },
      include: includesCuenta,
      order: [["fecha", "DESC"]],
    })
    res.json({ success: true, data: saltos.map(mapSalto) })
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, message: "Error al obtener saltos por usuario", error: error.message })
  }
}

export const eliminarSalto = async (req, res) => {
  try {
    const { id } = req.params
    const salto = await Salto.findByPk(id)
    if (!salto)
      return res.status(404).json({ success: false, message: "Salto no encontrado" })

    await salto.destroy()
    res.json({ success: true, message: "Salto eliminado correctamente" })
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, message: "Error al eliminar salto", error: error.message })
  }
}