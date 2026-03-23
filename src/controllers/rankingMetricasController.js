// controllers/rankingMetricasController.js
import { Op } from "sequelize"
import { Cuenta } from "../models/Cuenta.js"
import { Jugador } from "../models/Jugador.js"
import { Alcance } from "../models/Alcance.js"
import { Salto } from "../models/Salto.js"

const TIPOS_VALIDOS = ["salto simple", "salto conos"]

const calcularRangoFechas = (periodo) => {
  const ahora = new Date()
  let fechaInicio = null
  switch ((periodo || "general").toLowerCase()) {
    case "semanal": {
      fechaInicio = new Date(ahora)
      const dow = ahora.getDay() === 0 ? 6 : ahora.getDay() - 1
      fechaInicio.setDate(ahora.getDate() - dow)
      fechaInicio.setHours(0, 0, 0, 0)
      break
    }
    case "mensual":
      fechaInicio = new Date(ahora.getFullYear(), ahora.getMonth(), 1)
      break
    default:
      fechaInicio = null
  }
  return { fechaInicio, fechaFin: ahora }
}

const buildWhereAlcance  = (fechaInicio, fechaFin) => {
  const where = {}
  if (fechaInicio) where.fecha = { [Op.between]: [fechaInicio, fechaFin] }
  return where
}
const buildWhereSalto    = (fechaInicio, fechaFin) => {
  const where = { estado: "finalizada" }
  if (fechaInicio) where.fecha = { [Op.between]: [fechaInicio, fechaFin] }
  return where
}
const buildJugadorWhere  = ({ posicion, carrera }) => {
  const where = {}
  if (posicion) where.posicion_principal = posicion
  if (carrera)  where.carrera = carrera
  return where
}
const ordenarPorFechaDesc = (regs) =>
  regs.slice().sort((a, b) => new Date(b.fecha) - new Date(a.fecha) || b.id - a.id)

const fmt = (v) => Number((v ?? 0).toFixed(3))

const calcIncremento = (sorted, target, campo) => {
  if (!target) return null
  const idx = sorted.findIndex((r) => r.id === target.id)
  const anterior = sorted[idx + 1] ?? null
  if (!anterior) return null
  return fmt((target[campo] ?? 0) - (anterior[campo] ?? 0))
}

const buildMetrica = (sorted, mejorReg, peorReg, ultimo, campo) => ({
  actual:            fmt(ultimo?.[campo]),
  mejor:             fmt(mejorReg?.[campo]),
  peor:              fmt(peorReg?.[campo]),
  incremento_actual: calcIncremento(sorted, ultimo,   campo),
  incremento_mejor:  calcIncremento(sorted, mejorReg, campo),
  incremento_peor:   calcIncremento(sorted, peorReg,  campo),
})

const enriquecerSalto = (r) => {
  const raw = r.dataValues ?? r
  const izq = raw.fuerzaizquierda ?? raw.fuerzaIzquierda ?? 0
  const der = raw.fuerzaderecha   ?? raw.fuerzaDerecha   ?? 0
  return { ...raw, fuerzaTotal: fmt(izq + der) }
}

const mejorPeorPor = (regs, campo) => {
  const positivos = regs.filter((r) => (r[campo] ?? 0) > 0)
  const mejor = positivos.length ? positivos.reduce((m, r) => r[campo] >= m[campo] ? r : m) : null
  const peor  = positivos.length ? positivos.reduce((p, r) => r[campo] <= p[campo] ? r : p) : null
  return { mejor, peor }
}

const buildMetricaIndependiente = (sorted, regs, campo) => {
  const { mejor: mejorReg, peor: peorReg } = mejorPeorPor(regs, campo)
  const ultimo = sorted[0] ?? null
  return buildMetrica(sorted, mejorReg, peorReg, ultimo, campo)
}

// ─── ALCANCE - Resultados personales ─────────────────────────────────────────
export const obtenerResultadosPersonalesAlcance = async (req, res) => {
  try {
    const { cuentaId } = req.params
    const { periodo = "general" } = req.query
    const { fechaInicio, fechaFin } = calcularRangoFechas(periodo)
    const whereAlcance = buildWhereAlcance(fechaInicio, fechaFin)

    const cuenta = await Cuenta.findOne({
      where: { id: cuentaId, rol: "jugador", activo: true },
      include: [
        { model: Jugador, as: "jugador",  required: true },
        { model: Alcance, as: "alcances", where: whereAlcance, required: false },
      ],
    })
    if (!cuenta) return res.status(404).json({ success: false, message: "Usuario no encontrado" })

    const regs   = cuenta.alcances || []
    const sorted = ordenarPorFechaDesc(regs)
    const ultimo = sorted[0] ?? null
    const { mejor: mejorReg, peor: peorReg } = mejorPeorPor(regs, "alcance")

    const todasCuentas = await Cuenta.findAll({
      where: { rol: "jugador", activo: true },
      include: [
        { model: Jugador, as: "jugador",  required: true },
        { model: Alcance, as: "alcances", where: whereAlcance, required: false },
      ],
    })
    const itemsRanking = todasCuentas
      .map((c) => ({
        cuentaId: c.id,
        mejor_alcance: (c.alcances || []).reduce((m, r) => Math.max(m, r.alcance ?? 0), 0),
      }))
      .sort((a, b) => b.mejor_alcance - a.mejor_alcance)
    const posicion = itemsRanking.findIndex((i) => i.cuentaId === Number(cuentaId)) + 1

    res.json({
      success: true,
      data: {
        periodo,
        jugador: {
          id: cuenta.jugador.id, nombres: cuenta.jugador.nombres,
          apellidos: cuenta.jugador.apellidos, carrera: cuenta.jugador.carrera,
          posicion_principal: cuenta.jugador.posicion_principal,
        },
        estadisticas: { total_registros: regs.length, alcance: buildMetrica(sorted, mejorReg, peorReg, ultimo, "alcance") },
        ranking: { posicion, total_jugadores: itemsRanking.length },
      },
    })
  } catch (error) {
    console.error("Error obtenerResultadosPersonalesAlcance:", error)
    res.status(500).json({ success: false, message: "Error al obtener resultados de alcance", error: error.message })
  }
}

// ─── SALTO - Resultados personales ───────────────────────────────────────────
export const obtenerResultadosPersonalesSalto = async (req, res) => {
  try {
    const { cuentaId } = req.params
    const { periodo = "general", tipo } = req.query
    const { fechaInicio, fechaFin } = calcularRangoFechas(periodo)

    if (tipo && !TIPOS_VALIDOS.includes(tipo))
      return res.status(400).json({ success: false, message: `tipo inválido. Permitidos: ${TIPOS_VALIDOS.join(", ")}` })

    const whereSalto = buildWhereSalto(fechaInicio, fechaFin)
    if (tipo) whereSalto.tipo = tipo

    const cuenta = await Cuenta.findOne({
      where: { id: cuentaId, rol: "jugador", activo: true },
      include: [
        { model: Jugador, as: "jugador", required: true },
        { model: Salto,   as: "saltos",  where: whereSalto, required: false },
      ],
    })
    if (!cuenta) return res.status(404).json({ success: false, message: "Usuario no encontrado" })

    const regs   = (cuenta.saltos || []).map(enriquecerSalto)
    const sorted = ordenarPorFechaDesc(regs)

    // ── Ranking por mejor altura_promedio ──────────────────────────────────
    const todasCuentas = await Cuenta.findAll({
      where: { rol: "jugador", activo: true },
      include: [
        { model: Jugador, as: "jugador", required: true },
        { model: Salto,   as: "saltos",  where: whereSalto, required: false },
      ],
    })
    const itemsRanking = todasCuentas
      .map((c) => {
        const enr = (c.saltos || []).map(enriquecerSalto)
        return {
          cuentaId: c.id,
          mejor_altura: enr.reduce((m, r) => Math.max(m, r.altura_promedio ?? 0), 0),
        }
      })
      .sort((a, b) => b.mejor_altura - a.mejor_altura)
    const posicion = itemsRanking.findIndex((i) => i.cuentaId === Number(cuentaId)) + 1

    const estadisticas = {
      total_registros: regs.length,
      cantidad_saltos: buildMetricaIndependiente(sorted, regs, "cantidad_saltos"),
      indice_fatiga:   buildMetricaIndependiente(sorted, regs, "indice_fatiga"),
      fuerza:          buildMetricaIndependiente(sorted, regs, "fuerzaTotal"),
      altura_promedio: buildMetricaIndependiente(sorted, regs, "altura_promedio"),
    }
    if (!tipo || tipo === "salto simple") {
      estadisticas.potencia    = buildMetricaIndependiente(sorted, regs, "potencia")
      estadisticas.aceleracion = buildMetricaIndependiente(sorted, regs, "aceleracion")
    }

    res.json({
      success: true,
      data: {
        periodo, filtros: { tipo: tipo || "todos" },
        jugador: {
          id: cuenta.jugador.id, nombres: cuenta.jugador.nombres,
          apellidos: cuenta.jugador.apellidos, carrera: cuenta.jugador.carrera,
          posicion_principal: cuenta.jugador.posicion_principal,
        },
        estadisticas,
        ranking: { posicion, total_jugadores: itemsRanking.length },
      },
    })
  } catch (error) {
    console.error("Error obtenerResultadosPersonalesSalto:", error)
    res.status(500).json({ success: false, message: "Error al obtener resultados de salto", error: error.message })
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
        { model: Jugador, as: "jugador",  where: buildJugadorWhere({ posicion, carrera }), required: true },
        { model: Alcance, as: "alcances", where: buildWhereAlcance(fechaInicio, fechaFin), required: false },
      ],
    })
    const items = cuentas
      .map((c) => ({
        cuentaId: c.id,
        jugador: { nombres: c.jugador.nombres, apellidos: c.jugador.apellidos, posicion_principal: c.jugador.posicion_principal },
        mejor_alcance: (c.alcances || []).reduce((m, r) => Math.max(m, r.alcance ?? 0), 0),
      }))
      .sort((a, b) => b.mejor_alcance - a.mejor_alcance)
    const idx = items.findIndex(({ cuentaId: id }) => id === Number(cuentaId))
    if (idx === -1) return res.status(404).json({ success: false, message: "Usuario no encontrado" })
    res.json({ success: true, data: { periodo, posicion_ranking: idx + 1, total_jugadores: items.length, usuario: items[idx] } })
  } catch (error) {
    res.status(500).json({ success: false, message: "Error", error: error.message })
  }
}

// ─── SALTO - Posición usuario ─────────────────────────────────────────────────
export const obtenerPosicionUsuarioSalto = async (req, res) => {
  try {
    const { cuentaId } = req.params
    const { periodo = "general", posicion, carrera, tipo } = req.query
    const { fechaInicio, fechaFin } = calcularRangoFechas(periodo)
    const whereSalto = buildWhereSalto(fechaInicio, fechaFin)
    if (tipo) whereSalto.tipo = tipo
    const cuentas = await Cuenta.findAll({
      where: { rol: "jugador", activo: true },
      include: [
        { model: Jugador, as: "jugador", where: buildJugadorWhere({ posicion, carrera }), required: true },
        { model: Salto,   as: "saltos",  where: whereSalto, required: false },
      ],
    })
    const items = cuentas
      .map((c) => {
        const enr = (c.saltos || []).map(enriquecerSalto)
        return {
          cuentaId: c.id,
          mejor_altura: enr.reduce((m, r) => Math.max(m, r.altura_promedio ?? 0), 0),
        }
      })
      .sort((a, b) => b.mejor_altura - a.mejor_altura)
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
        { model: Jugador, as: "jugador",  where: buildJugadorWhere({ posicion, carrera }), required: true },
        { model: Alcance, as: "alcances", where: buildWhereAlcance(fechaInicio, fechaFin), required: false },
      ],
    })
    const ranking = cuentas
      .map((c) => {
        const regs = c.alcances || []
        return {
          cuentaId: c.id,
          jugador: { nombres: c.jugador.nombres, apellidos: c.jugador.apellidos, posicion_principal: c.jugador.posicion_principal },
          total_registros: regs.length,
          mejor_alcance: fmt(regs.reduce((m, r) => Math.max(m, r.alcance ?? 0), 0)),
        }
      })
      .sort((a, b) => b.mejor_alcance - a.mejor_alcance)
      .slice(0, Number(limit))
    res.json({ success: true, data: { periodo, top: ranking } })
  } catch (error) {
    res.status(500).json({ success: false, message: "Error", error: error.message })
  }
}

// ─── SALTO - Ranking general ──────────────────────────────────────────────────
export const obtenerRankingSalto = async (req, res) => {
  try {
    const { periodo = "general", posicion, carrera, limit = 5, tipo } = req.query

    if (tipo && !TIPOS_VALIDOS.includes(tipo))
      return res.status(400).json({ success: false, message: `tipo inválido. Permitidos: ${TIPOS_VALIDOS.join(", ")}` })

    const { fechaInicio, fechaFin } = calcularRangoFechas(periodo)
    const whereSalto = buildWhereSalto(fechaInicio, fechaFin)
    if (tipo) whereSalto.tipo = tipo

    const cuentas = await Cuenta.findAll({
      where: { rol: "jugador", activo: true },
      include: [
        { model: Jugador, as: "jugador", where: buildJugadorWhere({ posicion, carrera }), required: true },
        { model: Salto,   as: "saltos",  where: whereSalto, required: false },
      ],
    })
    const ranking = cuentas
      .map((c) => {
        const enr = (c.saltos || []).map(enriquecerSalto)
        return {
          cuentaId: c.id,
          jugador: { nombres: c.jugador.nombres, apellidos: c.jugador.apellidos, posicion_principal: c.jugador.posicion_principal },
          total_registros:    enr.length,
          mejor_altura:       fmt(enr.reduce((m, r) => Math.max(m, r.altura_promedio  ?? 0), 0)),
          mejor_fuerza_total: fmt(enr.reduce((m, r) => Math.max(m, r.fuerzaTotal      ?? 0), 0)),
          mejor_cantidad:     enr.reduce((m, r) => Math.max(m, r.cantidad_saltos ?? 0), 0),
          mejor_potencia:     fmt(enr.reduce((m, r) => Math.max(m, r.potencia         ?? 0), 0)),
        }
      })
      .sort((a, b) => b.mejor_altura - a.mejor_altura)
      .slice(0, Number(limit))

    res.json({ success: true, data: { periodo, filtros: { tipo: tipo || "todos" }, top: ranking } })
  } catch (error) {
    res.status(500).json({ success: false, message: "Error", error: error.message })
  }
}