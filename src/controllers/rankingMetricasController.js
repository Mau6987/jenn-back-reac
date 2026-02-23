// controllers/rankingMetricasController.js
import { Op } from "sequelize"
import { Cuenta } from "../models/Cuenta.js"
import { Jugador } from "../models/Jugador.js"
import { Alcance } from "../models/Alcance.js"
import { Pliometria } from "../models/Pliometria.js"

// ─── Helpers ──────────────────────────────────────────────────────────────────

const calcularRangoFechas = (periodo) => {
  const ahora = new Date()
  let fechaInicio
  switch ((periodo || "general").toLowerCase()) {
    case "semanal":
      fechaInicio = new Date(ahora)
      const dow = ahora.getDay() === 0 ? 6 : ahora.getDay() - 1
      fechaInicio.setDate(ahora.getDate() - dow)
      fechaInicio.setHours(0, 0, 0, 0)
      break
    case "mensual":
      fechaInicio = new Date(ahora.getFullYear(), ahora.getMonth(), 1)
      break
    default:
      fechaInicio = new Date(0)
  }
  return { fechaInicio, fechaFin: ahora }
}

const buildJugadorWhere = ({ periodo, posicion, carrera }) => {
  const where = {}
  if ((periodo || "general").toLowerCase() === "general") {
    if (posicion) where.posicion_principal = posicion
    if (carrera) where.carrera = carrera
  }
  return where
}

const ordenarPorFechaDesc = (regs) =>
  regs.slice().sort((a, b) => new Date(b.fecha) - new Date(a.fecha) || b.id - a.id)

const fmt = (v) => Number((v ?? 0).toFixed(3))

// ─── ALCANCE - Resultados personales ─────────────────────────────────────────
// GET /api/ranking/alcance/personal/:cuentaId
export const obtenerResultadosPersonalesAlcance = async (req, res) => {
  try {
    const { cuentaId } = req.params
    const { periodo = "general" } = req.query
    const { fechaInicio, fechaFin } = calcularRangoFechas(periodo)

    const cuenta = await Cuenta.findOne({
      where: { id: cuentaId, rol: "jugador", activo: true },
      include: [
        { model: Jugador, as: "jugador", required: true },
        {
          model: Alcance, as: "alcances",
          where: { estado: "finalizada", fecha: { [Op.between]: [fechaInicio, fechaFin] } },
          required: false,
        },
      ],
    })

    if (!cuenta) return res.status(404).json({ success: false, message: "Usuario no encontrado" })

    const regs  = cuenta.alcances || []
    const total = regs.length
    const sorted = ordenarPorFechaDesc(regs)
    const ultimo = sorted[0] ?? null

    // Mejor: registro con mayor alcance
    const mejorReg = regs.length
      ? regs.reduce((m, r) => (r.alcance ?? 0) >= (m.alcance ?? 0) ? r : m)
      : null

    // Peor: registro con menor alcance (solo entre los que tienen valor > 0)
    const regsPos  = regs.filter((r) => (r.alcance ?? 0) > 0)
    const peorReg  = regsPos.length
      ? regsPos.reduce((p, r) => (r.alcance ?? 0) <= (p.alcance ?? 0) ? r : p)
      : null

    const promedioAlcance  = total ? regs.reduce((s, r) => s + (r.alcance  ?? 0), 0) / total : 0
    const promedioPotencia = total ? regs.reduce((s, r) => s + (r.potencia ?? 0), 0) / total : 0

    // Ranking
    const todasCuentas = await Cuenta.findAll({
      where: { rol: "jugador", activo: true },
      include: [
        { model: Jugador, as: "jugador", required: true },
        { model: Alcance, as: "alcances", where: { estado: "finalizada", fecha: { [Op.between]: [fechaInicio, fechaFin] } }, required: false },
      ],
    })
    const itemsRanking = todasCuentas
      .map((c) => ({ cuentaId: c.id, mejor_alcance: (c.alcances || []).reduce((m, r) => Math.max(m, r.alcance ?? 0), 0) }))
      .sort((a, b) => b.mejor_alcance - a.mejor_alcance)
    const posicion = itemsRanking.findIndex((i) => i.cuentaId === Number(cuentaId)) + 1

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
          alcance: {
            actual:   fmt(ultimo?.alcance),
            mejor:    fmt(mejorReg?.alcance),
            peor:     fmt(peorReg?.alcance),
            promedio: fmt(promedioAlcance),
          },
          potencia: {
            actual:   fmt(ultimo?.potencia),
            mejor:    fmt(mejorReg?.potencia),
            peor:     fmt(peorReg?.potencia),
            promedio: fmt(promedioPotencia),
          },
          // alias para compatibilidad
          velocidad: {
            actual:   fmt(ultimo?.potencia),
            mejor:    fmt(mejorReg?.potencia),
            peor:     fmt(peorReg?.potencia),
            promedio: fmt(promedioPotencia),
          },
        },
        ranking: { posicion, total_jugadores: itemsRanking.length },
      },
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, message: "Error al obtener resultados de alcance", error: error.message })
  }
}

// ─── PLIOMETRÍA - Resultados personales ───────────────────────────────────────
// GET /api/ranking/pliometria/personal/:cuentaId
export const obtenerResultadosPersonalesPliometria = async (req, res) => {
  try {
    const { cuentaId } = req.params
    const { periodo = "general", tipo } = req.query
    const { fechaInicio, fechaFin } = calcularRangoFechas(periodo)

    const wherePlio = { estado: "finalizada", fecha: { [Op.between]: [fechaInicio, fechaFin] } }
    if (tipo) wherePlio.tipo = tipo

    const cuenta = await Cuenta.findOne({
      where: { id: cuentaId, rol: "jugador", activo: true },
      include: [
        { model: Jugador, as: "jugador", required: true },
        { model: Pliometria, as: "pliometrias", where: wherePlio, required: false },
      ],
    })

    if (!cuenta) return res.status(404).json({ success: false, message: "Usuario no encontrado" })

    const regs  = cuenta.pliometrias || []
    const total = regs.length

    // Enriquecer con fuerzaTotal
    const enriquecidos = regs.map((r) => ({
      ...r.dataValues,
      fuerzaTotal: (r.fuerzaizquierda ?? 0) + (r.fuerzaderecha ?? 0),
    }))

    const sorted = ordenarPorFechaDesc(enriquecidos)
    const ultimo = sorted[0] ?? null

    // Mejor: mayor fuerza total
    const mejorReg = enriquecidos.length
      ? enriquecidos.reduce((m, r) => r.fuerzaTotal >= m.fuerzaTotal ? r : m)
      : null

    // Peor: menor fuerza total (solo positivos)
    const enrPos  = enriquecidos.filter((r) => r.fuerzaTotal > 0)
    const peorReg = enrPos.length
      ? enrPos.reduce((p, r) => r.fuerzaTotal <= p.fuerzaTotal ? r : p)
      : null

    const promedioFuerza      = total ? enriquecidos.reduce((s, r) => s + r.fuerzaTotal, 0) / total : 0
    const promedioPotencia    = total ? regs.reduce((s, r) => s + (r.potencia    ?? 0), 0) / total : 0
    const promedioAceleracion = total ? regs.reduce((s, r) => s + (r.aceleracion ?? 0), 0) / total : 0

    // Ranking
    const todasCuentas = await Cuenta.findAll({
      where: { rol: "jugador", activo: true },
      include: [
        { model: Jugador, as: "jugador", required: true },
        { model: Pliometria, as: "pliometrias", where: wherePlio, required: false },
      ],
    })
    const itemsRanking = todasCuentas
      .map((c) => {
        const ft = (c.pliometrias || []).map((r) => (r.fuerzaizquierda ?? 0) + (r.fuerzaderecha ?? 0))
        return { cuentaId: c.id, mejor_fuerza_total: ft.reduce((m, v) => Math.max(m, v), 0) }
      })
      .sort((a, b) => b.mejor_fuerza_total - a.mejor_fuerza_total)
    const posicion = itemsRanking.findIndex((i) => i.cuentaId === Number(cuentaId)) + 1

    res.json({
      success: true,
      data: {
        periodo,
        filtros: { tipo: tipo || "todos" },
        jugador: {
          id: cuenta.jugador.id,
          nombres: cuenta.jugador.nombres,
          apellidos: cuenta.jugador.apellidos,
          carrera: cuenta.jugador.carrera,
          posicion_principal: cuenta.jugador.posicion_principal,
        },
        estadisticas: {
          total_registros: total,
          fuerza: {
            actual:   fmt(ultimo?.fuerzaTotal),
            mejor:    fmt(mejorReg?.fuerzaTotal),
            peor:     fmt(peorReg?.fuerzaTotal),
            promedio: fmt(promedioFuerza),
          },
          potencia: {
            actual:   fmt(ultimo?.potencia),
            mejor:    fmt(mejorReg?.potencia),
            peor:     fmt(peorReg?.potencia),
            promedio: fmt(promedioPotencia),
          },
          aceleracion: {
            actual:   fmt(ultimo?.aceleracion),
            mejor:    fmt(mejorReg?.aceleracion),
            peor:     fmt(peorReg?.aceleracion),
            promedio: fmt(promedioAceleracion),
          },
        },
        ranking: { posicion, total_jugadores: itemsRanking.length },
      },
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, message: "Error al obtener resultados de pliometría", error: error.message })
  }
}

// ─── ALCANCE - Posición usuario ───────────────────────────────────────────────
export const obtenerPosicionUsuarioAlcance = async (req, res) => {
  try {
    const { cuentaId } = req.params
    const { periodo = "general", posicion, carrera } = req.query
    const { fechaInicio, fechaFin } = calcularRangoFechas(periodo)
    const cuentas = await Cuenta.findAll({
      where: { rol: "jugador", activo: true },
      include: [
        { model: Jugador, as: "jugador", where: buildJugadorWhere({ periodo, posicion, carrera }), required: true },
        { model: Alcance, as: "alcances", where: { estado: "finalizada", fecha: { [Op.between]: [fechaInicio, fechaFin] } }, required: false },
      ],
    })
    const items = cuentas
      .map((c) => ({ cuentaId: c.id, jugador: { nombres: c.jugador.nombres, apellidos: c.jugador.apellidos, posicion_principal: c.jugador.posicion_principal }, mejor_alcance: (c.alcances || []).reduce((m, r) => Math.max(m, r.alcance ?? 0), 0) }))
      .sort((a, b) => b.mejor_alcance - a.mejor_alcance)
    const idx = items.findIndex(({ cuentaId: id }) => id === Number(cuentaId))
    if (idx === -1) return res.status(404).json({ success: false, message: "Usuario no encontrado" })
    res.json({ success: true, data: { periodo, posicion_ranking: idx + 1, total_jugadores: items.length, usuario: items[idx] } })
  } catch (error) {
    res.status(500).json({ success: false, message: "Error", error: error.message })
  }
}

// ─── PLIOMETRÍA - Posición usuario ───────────────────────────────────────────
export const obtenerPosicionUsuarioPliometria = async (req, res) => {
  try {
    const { cuentaId } = req.params
    const { periodo = "general", posicion, carrera, tipo } = req.query
    const { fechaInicio, fechaFin } = calcularRangoFechas(periodo)
    const wherePlio = { estado: "finalizada", fecha: { [Op.between]: [fechaInicio, fechaFin] } }
    if (tipo) wherePlio.tipo = tipo
    const cuentas = await Cuenta.findAll({
      where: { rol: "jugador", activo: true },
      include: [
        { model: Jugador, as: "jugador", where: buildJugadorWhere({ periodo, posicion, carrera }), required: true },
        { model: Pliometria, as: "pliometrias", where: wherePlio, required: false },
      ],
    })
    const items = cuentas
      .map((c) => { const ft = (c.pliometrias || []).map((r) => (r.fuerzaizquierda ?? 0) + (r.fuerzaderecha ?? 0)); return { cuentaId: c.id, mejor_fuerza_total: ft.reduce((m, v) => Math.max(m, v), 0) } })
      .sort((a, b) => b.mejor_fuerza_total - a.mejor_fuerza_total)
    const idx = items.findIndex(({ cuentaId: id }) => id === Number(cuentaId))
    if (idx === -1) return res.status(404).json({ success: false, message: "Usuario no encontrado" })
    res.json({ success: true, data: { periodo, posicion_ranking: idx + 1, total_jugadores: items.length } })
  } catch (error) {
    res.status(500).json({ success: false, message: "Error", error: error.message })
  }
}

// ─── ALCANCE - Ranking general ────────────────────────────────────────────────
export const obtenerRankingAlcance = async (req, res) => {
  try {
    const { periodo = "general", posicion, carrera, limit = 5 } = req.query
    const { fechaInicio, fechaFin } = calcularRangoFechas(periodo)
    const cuentas = await Cuenta.findAll({
      where: { rol: "jugador", activo: true },
      include: [
        { model: Jugador, as: "jugador", where: buildJugadorWhere({ periodo, posicion, carrera }), required: true },
        { model: Alcance, as: "alcances", where: { estado: "finalizada", fecha: { [Op.between]: [fechaInicio, fechaFin] } }, required: false },
      ],
    })
    const ranking = cuentas
      .map((c) => { const regs = c.alcances || []; return { cuentaId: c.id, jugador: { nombres: c.jugador.nombres, apellidos: c.jugador.apellidos, posicion_principal: c.jugador.posicion_principal }, total_registros: regs.length, mejor_alcance: fmt(regs.reduce((m, r) => Math.max(m, r.alcance ?? 0), 0)), mejor_potencia: fmt(regs.reduce((m, r) => Math.max(m, r.potencia ?? 0), 0)) } })
      .sort((a, b) => b.mejor_alcance - a.mejor_alcance).slice(0, Number(limit))
    res.json({ success: true, data: { periodo, top: ranking } })
  } catch (error) {
    res.status(500).json({ success: false, message: "Error", error: error.message })
  }
}

// ─── PLIOMETRÍA - Ranking general ────────────────────────────────────────────
export const obtenerRankingPliometria = async (req, res) => {
  try {
    const { periodo = "general", posicion, carrera, limit = 5, tipo } = req.query
    const { fechaInicio, fechaFin } = calcularRangoFechas(periodo)
    const wherePlio = { estado: "finalizada", fecha: { [Op.between]: [fechaInicio, fechaFin] } }
    if (tipo) wherePlio.tipo = tipo
    const cuentas = await Cuenta.findAll({
      where: { rol: "jugador", activo: true },
      include: [
        { model: Jugador, as: "jugador", where: buildJugadorWhere({ periodo, posicion, carrera }), required: true },
        { model: Pliometria, as: "pliometrias", where: wherePlio, required: false },
      ],
    })
    const ranking = cuentas
      .map((c) => { const regs = c.pliometrias || []; const ft = regs.map((r) => (r.fuerzaizquierda ?? 0) + (r.fuerzaderecha ?? 0)); return { cuentaId: c.id, jugador: { nombres: c.jugador.nombres, apellidos: c.jugador.apellidos, posicion_principal: c.jugador.posicion_principal }, total_registros: regs.length, mejor_fuerza_total: fmt(ft.reduce((m, v) => Math.max(m, v), 0)), mejor_potencia: fmt(regs.reduce((m, r) => Math.max(m, r.potencia ?? 0), 0)) } })
      .sort((a, b) => b.mejor_fuerza_total - a.mejor_fuerza_total).slice(0, Number(limit))
    res.json({ success: true, data: { periodo, top: ranking } })
  } catch (error) {
    res.status(500).json({ success: false, message: "Error", error: error.message })
  }
}