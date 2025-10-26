// controllers/rankingMetricasController.js
import { Op } from "sequelize"
import { Cuenta } from "../models/Cuenta.js"
import { Jugador } from "../models/Jugador.js"
import { Alcance } from "../models/Alcance.js"
import { Pliometria } from "../models/Pliometria.js"

// --------- Aux: rango de fechas por periodo ----------
const calcularRangoFechas = (periodo) => {
  const ahora = new Date()
  let fechaInicio
  switch ((periodo || "general").toLowerCase()) {
    case "semanal":
      fechaInicio = new Date(ahora); fechaInicio.setDate(ahora.getDate() - 7); break
    case "mensual":
      fechaInicio = new Date(ahora); fechaInicio.setMonth(ahora.getMonth() - 1); break
    case "general":
    default:
      fechaInicio = new Date(0)
  }
  return { fechaInicio, fechaFin: ahora }
}

// --------- Helpers de filtros por jugador ----------
const buildJugadorWhere = ({ periodo, posicion, carrera }) => {
  // Filtra por posicion/carrera SOLO cuando periodo = general (según tu requerimiento)
  const where = {}
  if ((periodo || "general").toLowerCase() === "general") {
    if (posicion) where.posicion_principal = posicion
    if (carrera) where.carrera = carrera
  }
  return where
}

// ========== ALCANCE ==========

// GET /ranking/alcance
export const obtenerRankingAlcance = async (req, res) => {
  try {
    const { periodo = "general", posicion, carrera, limit = 5 } = req.query
    const { fechaInicio, fechaFin } = calcularRangoFechas(periodo)

    const cuentas = await Cuenta.findAll({
      where: { rol: "jugador", activo: true },
      include: [
        { model: Jugador, as: "jugador", where: buildJugadorWhere({ periodo, posicion, carrera }), required: true },
        {
          model: Alcance, as: "alcances",
          where: {
            estado: "finalizada",
            fecha: { [Op.between]: [fechaInicio, fechaFin] },
          },
          required: false,
        },
      ],
    })

    const items = cuentas.map((c) => {
      const regs = c.alcances || []
      const total = regs.length

      // Métricas: mejor alcance y mejor potencia
      const mejorAlcance = regs.reduce((m, r) => Math.max(m, r.alcance ?? 0), 0)
      const mejorPotencia = regs.reduce((m, r) => Math.max(m, r.potencia ?? 0), 0)

      // También útiles
      const promedioAlcance = total ? regs.reduce((s, r) => s + (r.alcance ?? 0), 0) / total : 0
      const promedioPotencia = total ? regs.reduce((s, r) => s + (r.potencia ?? 0), 0) / total : 0

      return {
        cuentaId: c.id,
        jugador: {
          id: c.jugador.id,
          nombres: c.jugador.nombres,
          apellidos: c.jugador.apellidos,
          carrera: c.jugador.carrera,
          posicion_principal: c.jugador.posicion_principal,
        },
        total_registros: total,
        mejor_alcance: Number(mejorAlcance.toFixed(3)),
        mejor_potencia: Number(mejorPotencia.toFixed(3)),
        promedio_alcance: Number(promedioAlcance.toFixed(3)),
        promedio_potencia: Number(promedioPotencia.toFixed(3)),
      }
    })

    // Orden: mayor mejor_alcance, desempate mejor_potencia
    const ranking = items
      .sort((a, b) =>
        b.mejor_alcance - a.mejor_alcance || b.mejor_potencia - a.mejor_potencia
      )
      .slice(0, Number(limit) || 5)

    res.json({
      success: true,
      data: {
        periodo,
        filtros: {
          posicion: (periodo === "general" && posicion) ? posicion : "todas",
          carrera: (periodo === "general" && carrera) ? carrera : "todas",
        },
        top: ranking,
      },
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, message: "Error al obtener ranking de alcance", error: error.message })
  }
}

// GET /ranking/alcance/posicion/:cuentaId
export const obtenerPosicionUsuarioAlcance = async (req, res) => {
  try {
    const { cuentaId } = req.params
    const { periodo = "general", posicion, carrera } = req.query
    const { fechaInicio, fechaFin } = calcularRangoFechas(periodo)

    const cuentas = await Cuenta.findAll({
      where: { rol: "jugador", activo: true },
      include: [
        { model: Jugador, as: "jugador", where: buildJugadorWhere({ periodo, posicion, carrera }), required: true },
        {
          model: Alcance, as: "alcances",
          where: {
            estado: "finalizada",
            fecha: { [Op.between]: [fechaInicio, fechaFin] },
          },
          required: false,
        },
      ],
    })

    const items = cuentas.map((c) => {
      const regs = c.alcances || []
      const mejorAlcance = regs.reduce((m, r) => Math.max(m, r.alcance ?? 0), 0)
      const mejorPotencia = regs.reduce((m, r) => Math.max(m, r.potencia ?? 0), 0)
      return {
        cuentaId: c.id,
        jugador: {
          id: c.jugador.id,
          nombres: c.jugador.nombres,
          apellidos: c.jugador.apellidos,
          carrera: c.jugador.carrera,
          posicion_principal: c.jugador.posicion_principal,
        },
        mejor_alcance: Number(mejorAlcance.toFixed(3)),
        mejor_potencia: Number(mejorPotencia.toFixed(3)),
      }
    })

    const rankingCompleto = items.sort(
      (a, b) => b.mejor_alcance - a.mejor_alcance || b.mejor_potencia - a.mejor_potencia
    )

    const idx = rankingCompleto.findIndex(({ cuentaId: id }) => id === Number(cuentaId))
    if (idx === -1) return res.status(404).json({ success: false, message: "Usuario no encontrado en ranking" })

    res.json({
      success: true,
      data: {
        periodo,
        filtros: {
          posicion: (periodo === "general" && posicion) ? posicion : "todas",
          carrera: (periodo === "general" && carrera) ? carrera : "todas",
        },
        posicion_ranking: idx + 1,
        total_jugadores: rankingCompleto.length,
        usuario: rankingCompleto[idx],
      },
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, message: "Error al obtener posición de alcance", error: error.message })
  }
}

// ========== PLIOMETRÍA ==========

// GET /ranking/pliometria
export const obtenerRankingPliometria = async (req, res) => {
  try {
    const { periodo = "general", posicion, carrera, limit = 5, tipo } = req.query
    const { fechaInicio, fechaFin } = calcularRangoFechas(periodo)

    const wherePlio = {
      estado: "finalizada",
      fecha: { [Op.between]: [fechaInicio, fechaFin] },
    }
    if (tipo) wherePlio.tipo = tipo // opcional (si quieres rankear por tipo específico)

    const cuentas = await Cuenta.findAll({
      where: { rol: "jugador", activo: true },
      include: [
        { model: Jugador, as: "jugador", where: buildJugadorWhere({ periodo, posicion, carrera }), required: true },
        { model: Pliometria, as: "pliometrias", where: wherePlio, required: false },
      ],
    })

    const items = cuentas.map((c) => {
      const regs = c.pliometrias || []
      const total = regs.length

      // Por registro: promedio fuerzas = (izq + der)/2
      const promediosRegistro = regs.map(r => ((r.fuerzaizquierda ?? 0) + (r.fuerzaderecha ?? 0)) / 2)

      const mejorPromFuerzas = promediosRegistro.reduce((m, v) => Math.max(m, v ?? 0), 0)
      const mejorPotencia = regs.reduce((m, r) => Math.max(m, r.potencia ?? 0), 0)

      const promedioFuerzasGeneral = total ? (promediosRegistro.reduce((s, v) => s + v, 0) / total) : 0
      const promedioPotencia = total ? (regs.reduce((s, r) => s + (r.potencia ?? 0), 0) / total) : 0

      return {
        cuentaId: c.id,
        jugador: {
          id: c.jugador.id,
          nombres: c.jugador.nombres,
          apellidos: c.jugador.apellidos,
          carrera: c.jugador.carrera,
          posicion_principal: c.jugador.posicion_principal,
        },
        total_registros: total,
        mejor_promedio_fuerzas: Number(mejorPromFuerzas.toFixed(3)),
        mejor_potencia: Number(mejorPotencia.toFixed(3)),
        promedio_fuerzas: Number(promedioFuerzasGeneral.toFixed(3)),
        promedio_potencia: Number(promedioPotencia.toFixed(3)),
      }
    })

    // Orden: mayor mejor_promedio_fuerzas, desempate mejor_potencia
    const ranking = items
      .sort((a, b) =>
        b.mejor_promedio_fuerzas - a.mejor_promedio_fuerzas || b.mejor_potencia - a.mejor_potencia
      )
      .slice(0, Number(limit) || 5)

    res.json({
      success: true,
      data: {
        periodo,
        filtros: {
          posicion: (periodo === "general" && posicion) ? posicion : "todas",
          carrera: (periodo === "general" && carrera) ? carrera : "todas",
          tipo: tipo || "todos",
        },
        top: ranking,
      },
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, message: "Error al obtener ranking de pliometría", error: error.message })
  }
}

// GET /ranking/pliometria/posicion/:cuentaId
export const obtenerPosicionUsuarioPliometria = async (req, res) => {
  try {
    const { cuentaId } = req.params
    const { periodo = "general", posicion, carrera, tipo } = req.query
    const { fechaInicio, fechaFin } = calcularRangoFechas(periodo)

    const wherePlio = {
      estado: "finalizada",
      fecha: { [Op.between]: [fechaInicio, fechaFin] },
    }
    if (tipo) wherePlio.tipo = tipo

    const cuentas = await Cuenta.findAll({
      where: { rol: "jugador", activo: true },
      include: [
        { model: Jugador, as: "jugador", where: buildJugadorWhere({ periodo, posicion, carrera }), required: true },
        { model: Pliometria, as: "pliometrias", where: wherePlio, required: false },
      ],
    })

    const items = cuentas.map((c) => {
      const regs = c.pliometrias || []
      const promediosRegistro = regs.map(r => ((r.fuerzaizquierda ?? 0) + (r.fuerzaderecha ?? 0)) / 2)
      const mejorPromFuerzas = promediosRegistro.reduce((m, v) => Math.max(m, v ?? 0), 0)
      const mejorPotencia = regs.reduce((m, r) => Math.max(m, r.potencia ?? 0), 0)
      return {
        cuentaId: c.id,
        jugador: {
          id: c.jugador.id,
          nombres: c.jugador.nombres,
          apellidos: c.jugador.apellidos,
          carrera: c.jugador.carrera,
          posicion_principal: c.jugador.posicion_principal,
        },
        mejor_promedio_fuerzas: Number(mejorPromFuerzas.toFixed(3)),
        mejor_potencia: Number(mejorPotencia.toFixed(3)),
      }
    })

    const rankingCompleto = items.sort(
      (a, b) =>
        b.mejor_promedio_fuerzas - a.mejor_promedio_fuerzas ||
        b.mejor_potencia - a.mejor_potencia
    )

    const idx = rankingCompleto.findIndex(({ cuentaId: id }) => id === Number(cuentaId))
    if (idx === -1) return res.status(404).json({ success: false, message: "Usuario no encontrado en ranking" })

    res.json({
      success: true,
      data: {
        periodo,
        filtros: {
          posicion: (periodo === "general" && posicion) ? posicion : "todas",
          carrera: (periodo === "general" && carrera) ? carrera : "todas",
          tipo: tipo || "todos",
        },
        posicion_ranking: idx + 1,
        total_jugadores: rankingCompleto.length,
        usuario: rankingCompleto[idx],
      },
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, message: "Error al obtener posición de pliometría", error: error.message })
  }
}
