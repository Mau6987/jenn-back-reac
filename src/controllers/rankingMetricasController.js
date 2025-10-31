// controllers/rankingMetricasController.js
import { Op } from "sequelize"
import { Cuenta } from "../models/Cuenta.js"
import { Jugador } from "../models/Jugador.js"
import { Alcance } from "../models/Alcance.js"
import { Pliometria } from "../models/Pliometria.js"

// ========== FUNCIONES AUXILIARES ==========

// Calcular rango de fechas según el periodo
const calcularRangoFechas = (periodo) => {
  const ahora = new Date()
  let fechaInicio
  switch ((periodo || "general").toLowerCase()) {
    case "semanal":
      fechaInicio = new Date(ahora)
      fechaInicio.setDate(ahora.getDate() - 7)
      break
    case "mensual":
      fechaInicio = new Date(ahora)
      fechaInicio.setMonth(ahora.getMonth() - 1)
      break
    case "general":
    default:
      fechaInicio = new Date(0)
  }
  return { fechaInicio, fechaFin: ahora }
}

// Construir filtros de jugador (solo aplica en periodo general)
const buildJugadorWhere = ({ periodo, posicion, carrera }) => {
  const where = {}
  if ((periodo || "general").toLowerCase() === "general") {
    if (posicion) where.posicion_principal = posicion
    if (carrera) where.carrera = carrera
  }
  return where
}

// ========== ALCANCE - POSICIÓN USUARIO ==========

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

// ========== PLIOMETRÍA - POSICIÓN USUARIO (usa fuerza total) ==========

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
      const fuerzaTotalPorRegistro = regs.map(r => (r.fuerzaizquierda ?? 0) + (r.fuerzaderecha ?? 0))
      const mejorFuerzaTotal = fuerzaTotalPorRegistro.reduce((m, v) => Math.max(m, v ?? 0), 0)
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
        mejor_fuerza_total: Number(mejorFuerzaTotal.toFixed(3)),
        mejor_potencia: Number(mejorPotencia.toFixed(3)),
      }
    })

    const rankingCompleto = items.sort(
      (a, b) =>
        b.mejor_fuerza_total - a.mejor_fuerza_total ||
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

// ========== ALCANCE - RANKING GENERAL ==========

// GET /api/ranking/alcance
export const obtenerRankingAlcance = async (req, res) => {
  try {
    const { periodo = "general", posicion, carrera, limit = 5 } = req.query
    const { fechaInicio, fechaFin } = calcularRangoFechas(periodo)

    const cuentas = await Cuenta.findAll({
      where: { rol: "jugador", activo: true },
      include: [
        {
          model: Jugador,
          as: "jugador",
          where: buildJugadorWhere({ periodo, posicion, carrera }),
          required: true,
        },
        {
          model: Alcance,
          as: "alcances",
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

      const mejorAlcance = regs.reduce((m, r) => Math.max(m, r.alcance ?? 0), 0)
      const mejorPotencia = regs.reduce((m, r) => Math.max(m, r.potencia ?? 0), 0)
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

    const ranking = items
      .sort((a, b) => b.mejor_alcance - a.mejor_alcance || b.mejor_potencia - a.mejor_potencia)
      .slice(0, Number(limit) || 5)

    res.json({
      success: true,
      data: {
        periodo,
        filtros: {
          posicion: periodo === "general" && posicion ? posicion : "todas",
          carrera: periodo === "general" && carrera ? carrera : "todas",
        },
        top: ranking,
      },
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({
      success: false,
      message: "Error al obtener ranking de alcance",
      error: error.message,
    })
  }
}

// ========== ALCANCE - RESULTADOS PERSONALES (peor, actual, mejor) ==========

// GET /api/ranking/alcance/personal/:cuentaId
export const obtenerResultadosPersonalesAlcance = async (req, res) => {
  try {
    const { cuentaId } = req.params
    const { periodo = "general" } = req.query
    const { fechaInicio, fechaFin } = calcularRangoFechas(periodo)

    // Obtener cuenta con jugador y alcances
    const cuenta = await Cuenta.findOne({
      where: { id: cuentaId, rol: "jugador", activo: true },
      include: [
        { model: Jugador, as: "jugador", required: true },
        {
          model: Alcance,
          as: "alcances",
          where: {
            estado: "finalizada",
            fecha: { [Op.between]: [fechaInicio, fechaFin] },
          },
          required: false,
        },
      ],
    })

    if (!cuenta) {
      return res.status(404).json({
        success: false,
        message: "Usuario no encontrado",
      })
    }

    const regs = cuenta.alcances || []
    const total = regs.length

    const mejorAlcance = regs.reduce((m, r) => Math.max(m, r.alcance ?? 0), 0)
    const peorAlcance = total ? regs.reduce((m, r) => Math.min(m, r.alcance ?? Infinity), Infinity) : 0
    const mejorPotencia = regs.reduce((m, r) => Math.max(m, r.potencia ?? 0), 0)
    const peorPotencia = total ? regs.reduce((m, r) => Math.min(m, r.potencia ?? Infinity), Infinity) : 0

    // Actual = último registro por fecha (más reciente) con estado finalizada
    const ultimo = total
      ? regs.slice().sort((a, b) => new Date(b.fecha) - new Date(a.fecha) || b.id - a.id)[0]
      : null
    const alcanceActual = ultimo?.alcance ?? 0
    const potenciaActual = ultimo?.potencia ?? 0

    const promedioAlcance = total ? regs.reduce((s, r) => s + (r.alcance ?? 0), 0) / total : 0
    const promedioPotencia = total ? regs.reduce((s, r) => s + (r.potencia ?? 0), 0) / total : 0

    // Obtener posición en el ranking (por mejor alcance)
    const cuentas = await Cuenta.findAll({
      where: { rol: "jugador", activo: true },
      include: [
        { model: Jugador, as: "jugador", required: true },
        {
          model: Alcance,
          as: "alcances",
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
      return { cuentaId: c.id, mejor_alcance: mejorAlcance }
    })

    const rankingCompleto = items.sort((a, b) => b.mejor_alcance - a.mejor_alcance)
    const posicion = rankingCompleto.findIndex((item) => item.cuentaId === Number(cuentaId)) + 1

    res.json({
      success: true,
      data: {
        periodo,
        jugador: {
          id: cuenta.jugador.id,
          nombres: cuenta.jugador.nombres,
          apellidos: cuenta.jugador.apellidos,
          carrera: cuenta.jugador.carrera,
          posicion_principal: cuenta.jugador.posicion_principal,
        },
        estadisticas: {
          total_registros: total,
          peor_alcance: Number((peorAlcance === Infinity ? 0 : peorAlcance).toFixed(3)),
          alcance_actual: Number(alcanceActual.toFixed(3)),
          mejor_alcance: Number(mejorAlcance.toFixed(3)),
          peor_potencia: Number((peorPotencia === Infinity ? 0 : peorPotencia).toFixed(3)),
          potencia_actual: Number(potenciaActual.toFixed(3)),
          mejor_potencia: Number(mejorPotencia.toFixed(3)),
          promedio_alcance: Number(promedioAlcance.toFixed(3)),
          promedio_potencia: Number(promedioPotencia.toFixed(3)),
        },
        ranking: {
          posicion,
          total_jugadores: rankingCompleto.length,
        },
      },
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({
      success: false,
      message: "Error al obtener resultados personales de alcance",
      error: error.message,
    })
  }
}

// ========== PLIOMETRÍA - RANKING GENERAL (fuerza total y promedios) ==========

// GET /api/ranking/pliometria
export const obtenerRankingPliometria = async (req, res) => {
  try {
    const { periodo = "general", posicion, carrera, limit = 5, tipo } = req.query
    const { fechaInicio, fechaFin } = calcularRangoFechas(periodo)

    const wherePlio = {
      estado: "finalizada",
      fecha: { [Op.between]: [fechaInicio, fechaFin] },
    }
    if (tipo) wherePlio.tipo = tipo

    const cuentas = await Cuenta.findAll({
      where: { rol: "jugador", activo: true },
      include: [
        {
          model: Jugador,
          as: "jugador",
          where: buildJugadorWhere({ periodo, posicion, carrera }),
          required: true,
        },
        {
          model: Pliometria,
          as: "pliometrias",
          where: wherePlio,
          required: false,
        },
      ],
    })

    const items = cuentas.map((c) => {
      const regs = c.pliometrias || []
      const total = regs.length

      // Fuerza TOTAL por registro = suma (izq + der)
      const fuerzaTotalPorRegistro = regs.map((r) => (r.fuerzaizquierda ?? 0) + (r.fuerzaderecha ?? 0))
      const mejorFuerzaTotal = fuerzaTotalPorRegistro.reduce((m, v) => Math.max(m, v ?? 0), 0)
      const mejorPotencia = regs.reduce((m, r) => Math.max(m, r.potencia ?? 0), 0)

      const promedioFuerzaTotal = total ? fuerzaTotalPorRegistro.reduce((s, v) => s + v, 0) / total : 0
      const promedioPotencia = total ? regs.reduce((s, r) => s + (r.potencia ?? 0), 0) / total : 0
      const promedioAceleracion = total ? regs.reduce((s, r) => s + (r.aceleracion ?? 0), 0) / total : 0

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
        mejor_fuerza_total: Number(mejorFuerzaTotal.toFixed(3)),
        mejor_potencia: Number(mejorPotencia.toFixed(3)),
        promedio_fuerza_total: Number(promedioFuerzaTotal.toFixed(3)),
        promedio_potencia: Number(promedioPotencia.toFixed(3)),
        promedio_aceleracion: Number(promedioAceleracion.toFixed(3)),
      }
    })

    const ranking = items
      .sort((a, b) => b.mejor_fuerza_total - a.mejor_fuerza_total || b.mejor_potencia - a.mejor_potencia)
      .slice(0, Number(limit) || 5)

    res.json({
      success: true,
      data: {
        periodo,
        filtros: {
          posicion: periodo === "general" && posicion ? posicion : "todas",
          carrera: periodo === "general" && carrera ? carrera : "todas",
          tipo: tipo || "todos",
        },
        top: ranking,
      },
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({
      success: false,
      message: "Error al obtener ranking de pliometría",
      error: error.message,
    })
  }
}

// ========== PLIOMETRÍA - RESULTADOS PERSONALES (fuerza total y promedios) ==========

// GET /api/ranking/pliometria/personal/:cuentaId
export const obtenerResultadosPersonalesPliometria = async (req, res) => {
  try {
    const { cuentaId } = req.params
    const { periodo = "general", tipo } = req.query
    const { fechaInicio, fechaFin } = calcularRangoFechas(periodo)

    const wherePlio = {
      estado: "finalizada",
      fecha: { [Op.between]: [fechaInicio, fechaFin] },
    }
    if (tipo) wherePlio.tipo = tipo

    // Obtener cuenta con jugador y pliometrías
    const cuenta = await Cuenta.findOne({
      where: { id: cuentaId, rol: "jugador", activo: true },
      include: [
        { model: Jugador, as: "jugador", required: true },
        {
          model: Pliometria,
          as: "pliometrias",
          where: wherePlio,
          required: false,
        },
      ],
    })

    if (!cuenta) {
      return res.status(404).json({
        success: false,
        message: "Usuario no encontrado",
      })
    }

    const regs = cuenta.pliometrias || []
    const total = regs.length

    const fuerzaTotalPorRegistro = regs.map((r) => (r.fuerzaizquierda ?? 0) + (r.fuerzaderecha ?? 0))
    const mejorFuerzaTotal = fuerzaTotalPorRegistro.reduce((m, v) => Math.max(m, v ?? 0), 0)
    const mejorPotencia = regs.reduce((m, r) => Math.max(m, r.potencia ?? 0), 0)
    const promedioFuerzaTotal = total ? fuerzaTotalPorRegistro.reduce((s, v) => s + v, 0) / total : 0
    const promedioPotencia = total ? regs.reduce((s, r) => s + (r.potencia ?? 0), 0) / total : 0
    const promedioAceleracion = total ? regs.reduce((s, r) => s + (r.aceleracion ?? 0), 0) / total : 0

    // Obtener posición en el ranking (por mejor fuerza total)
    const cuentas = await Cuenta.findAll({
      where: { rol: "jugador", activo: true },
      include: [
        { model: Jugador, as: "jugador", required: true },
        {
          model: Pliometria,
          as: "pliometrias",
          where: wherePlio,
          required: false,
        },
      ],
    })

    const items = cuentas.map((c) => {
      const regs = c.pliometrias || []
      const fuerzaTotalPorRegistro = regs.map((r) => (r.fuerzaizquierda ?? 0) + (r.fuerzaderecha ?? 0))
      const mejorFuerzaTotal = fuerzaTotalPorRegistro.reduce((m, v) => Math.max(m, v ?? 0), 0)
      return { cuentaId: c.id, mejor_fuerza_total: mejorFuerzaTotal }
    })

    const rankingCompleto = items.sort((a, b) => b.mejor_fuerza_total - a.mejor_fuerza_total)
    const posicion = rankingCompleto.findIndex((item) => item.cuentaId === Number(cuentaId)) + 1

    res.json({
      success: true,
      data: {
        periodo,
        filtros: {
          tipo: tipo || "todos",
        },
        jugador: {
          id: cuenta.jugador.id,
          nombres: cuenta.jugador.nombres,
          apellidos: cuenta.jugador.apellidos,
          carrera: cuenta.jugador.carrera,
          posicion_principal: cuenta.jugador.posicion_principal,
        },
        estadisticas: {
          total_registros: total,
          mejor_fuerza_total: Number(mejorFuerzaTotal.toFixed(3)),
          mejor_potencia: Number(mejorPotencia.toFixed(3)),
          promedio_fuerza_total: Number(promedioFuerzaTotal.toFixed(3)),
          promedio_potencia: Number(promedioPotencia.toFixed(3)),
          promedio_aceleracion: Number(promedioAceleracion.toFixed(3)),
        },
        ranking: {
          posicion,
          total_jugadores: rankingCompleto.length,
        },
      },
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({
      success: false,
      message: "Error al obtener resultados personales de pliometría",
      error: error.message,
    })
  }
}
