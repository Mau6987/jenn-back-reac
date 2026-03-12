// controllers/rankingMetricasController.js
import { Op } from "sequelize"
import { Cuenta } from "../models/Cuenta.js"
import { Jugador } from "../models/Jugador.js"
import { Alcance } from "../models/Alcance.js"
import { Pliometria } from "../models/Pliometria.js"

// ─── Tipos válidos ────────────────────────────────────────────────────────────
const TIPOS_VALIDOS = ["salto simple", "salto conos"]

// ─── Helpers ──────────────────────────────────────────────────────────────────
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

const buildWhereAlcance = (fechaInicio, fechaFin) => {
  const where = {}
  if (fechaInicio) where.fecha = { [Op.between]: [fechaInicio, fechaFin] }
  return where
}

const buildWherePliometria = (fechaInicio, fechaFin) => {
  const where = { estado: "finalizada" }
  if (fechaInicio) where.fecha = { [Op.between]: [fechaInicio, fechaFin] }
  return where
}

const buildJugadorWhere = ({ posicion, carrera }) => {
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

// Enriquece un registro de pliometría con campos derivados
const enriquecerPlio = (r) => ({
  ...r.dataValues,
  // fuerza total = suma de ambas piernas (en kg, tal como viene del ESP)
  fuerzaTotal: fmt((r.fuerzaizquierda ?? 0) + (r.fuerzaderecha ?? 0)),
})

// Busca el mejor y peor registro por un campo dado
const mejorPeorPor = (regs, campo) => {
  const positivos = regs.filter((r) => (r[campo] ?? 0) > 0)
  const mejor = positivos.length ? positivos.reduce((m, r) => r[campo] >= m[campo] ? r : m) : null
  const peor  = positivos.length ? positivos.reduce((p, r) => r[campo] <= p[campo] ? r : p) : null
  return { mejor, peor }
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

    // Ranking general
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
          id:                 cuenta.jugador.id,
          nombres:            cuenta.jugador.nombres,
          apellidos:          cuenta.jugador.apellidos,
          carrera:            cuenta.jugador.carrera,
          posicion_principal: cuenta.jugador.posicion_principal,
        },
        estadisticas: {
          total_registros: regs.length,
          alcance: buildMetrica(sorted, mejorReg, peorReg, ultimo, "alcance"),
        },
        ranking: { posicion, total_jugadores: itemsRanking.length },
      },
    })
  } catch (error) {
    console.error("Error obtenerResultadosPersonalesAlcance:", error)
    res.status(500).json({ success: false, message: "Error al obtener resultados de alcance", error: error.message })
  }
}

// ─── PLIOMETRÍA - Resultados personales ───────────────────────────────────────
//
// Campos del modelo usados según tipo:
//
// salto simple → cantidad_saltos, indice_fatiga, fuerzaizquierda, fuerzaderecha,
//                altura_promedio (=alt_prom_cm), potencia, aceleracion
//
// salto conos  → cantidad_saltos, indice_fatiga, fuerzaizquierda (=pico_izq_kg),
//                fuerzaderecha (=pico_der_kg), altura_promedio (=alt_max_cm)
//                potencia y aceleracion NO aplican (quedan en 0)
//
export const obtenerResultadosPersonalesPliometria = async (req, res) => {
  try {
    const { cuentaId } = req.params
    const { periodo = "general", tipo } = req.query
    const { fechaInicio, fechaFin } = calcularRangoFechas(periodo)

    // Validar tipo
    if (tipo && !TIPOS_VALIDOS.includes(tipo))
      return res.status(400).json({ success: false, message: `tipo inválido. Permitidos: ${TIPOS_VALIDOS.join(", ")}` })

    const wherePlio = buildWherePliometria(fechaInicio, fechaFin)
    if (tipo) wherePlio.tipo = tipo

    const cuenta = await Cuenta.findOne({
      where: { id: cuentaId, rol: "jugador", activo: true },
      include: [
        { model: Jugador,    as: "jugador",     required: true },
        { model: Pliometria, as: "pliometrias", where: wherePlio, required: false },
      ],
    })

    if (!cuenta) return res.status(404).json({ success: false, message: "Usuario no encontrado" })

    const regs        = (cuenta.pliometrias || []).map(enriquecerPlio)
    const sorted      = ordenarPorFechaDesc(regs)
    const ultimo      = sorted[0] ?? null

    // Usamos fuerzaTotal como métrica principal para elegir mejor/peor
    const { mejor: mejorReg, peor: peorReg } = mejorPeorPor(regs, "fuerzaTotal")

    // Ranking
    const todasCuentas = await Cuenta.findAll({
      where: { rol: "jugador", activo: true },
      include: [
        { model: Jugador,    as: "jugador",     required: true },
        { model: Pliometria, as: "pliometrias", where: wherePlio, required: false },
      ],
    })
    const itemsRanking = todasCuentas
      .map((c) => {
        const enr = (c.pliometrias || []).map(enriquecerPlio)
        return {
          cuentaId: c.id,
          mejor_fuerza_total: enr.reduce((m, r) => Math.max(m, r.fuerzaTotal ?? 0), 0),
        }
      })
      .sort((a, b) => b.mejor_fuerza_total - a.mejor_fuerza_total)
    const posicion = itemsRanking.findIndex((i) => i.cuentaId === Number(cuentaId)) + 1

    // Estadísticas — se construyen siempre; para salto conos potencia y aceleracion estarán en 0
    const estadisticas = {
      total_registros: regs.length,
      cantidad_saltos: buildMetrica(sorted, mejorReg, peorReg, ultimo, "cantidad_saltos"),
      indice_fatiga:   buildMetrica(sorted, mejorReg, peorReg, ultimo, "indice_fatiga"),
      fuerza:          buildMetrica(sorted, mejorReg, peorReg, ultimo, "fuerzaTotal"),
      altura_promedio: buildMetrica(sorted, mejorReg, peorReg, ultimo, "altura_promedio"),
    }

    // Solo incluir potencia y aceleración para salto simple
    if (!tipo || tipo === "salto simple") {
      estadisticas.potencia    = buildMetrica(sorted, mejorReg, peorReg, ultimo, "potencia")
      estadisticas.aceleracion = buildMetrica(sorted, mejorReg, peorReg, ultimo, "aceleracion")
    }

    res.json({
      success: true,
      data: {
        periodo,
        filtros: { tipo: tipo || "todos" },
        jugador: {
          id:                 cuenta.jugador.id,
          nombres:            cuenta.jugador.nombres,
          apellidos:          cuenta.jugador.apellidos,
          carrera:            cuenta.jugador.carrera,
          posicion_principal: cuenta.jugador.posicion_principal,
        },
        estadisticas,
        ranking: { posicion, total_jugadores: itemsRanking.length },
      },
    })
  } catch (error) {
    console.error("Error obtenerResultadosPersonalesPliometria:", error)
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
    console.error("Error obtenerPosicionUsuarioAlcance:", error)
    res.status(500).json({ success: false, message: "Error", error: error.message })
  }
}

// ─── PLIOMETRÍA - Posición usuario ───────────────────────────────────────────
export const obtenerPosicionUsuarioPliometria = async (req, res) => {
  try {
    const { cuentaId } = req.params
    const { periodo = "general", posicion, carrera, tipo } = req.query
    const { fechaInicio, fechaFin } = calcularRangoFechas(periodo)
    const wherePlio = buildWherePliometria(fechaInicio, fechaFin)
    if (tipo) wherePlio.tipo = tipo
    const cuentas = await Cuenta.findAll({
      where: { rol: "jugador", activo: true },
      include: [
        { model: Jugador,    as: "jugador",     where: buildJugadorWhere({ posicion, carrera }), required: true },
        { model: Pliometria, as: "pliometrias", where: wherePlio, required: false },
      ],
    })
    const items = cuentas
      .map((c) => {
        const enr = (c.pliometrias || []).map(enriquecerPlio)
        return { cuentaId: c.id, mejor_fuerza_total: enr.reduce((m, r) => Math.max(m, r.fuerzaTotal ?? 0), 0) }
      })
      .sort((a, b) => b.mejor_fuerza_total - a.mejor_fuerza_total)
    const idx = items.findIndex(({ cuentaId: id }) => id === Number(cuentaId))
    if (idx === -1) return res.status(404).json({ success: false, message: "Usuario no encontrado" })
    res.json({ success: true, data: { periodo, posicion_ranking: idx + 1, total_jugadores: items.length } })
  } catch (error) {
    console.error("Error obtenerPosicionUsuarioPliometria:", error)
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
    console.error("Error obtenerRankingAlcance:", error)
    res.status(500).json({ success: false, message: "Error", error: error.message })
  }
}

// ─── PLIOMETRÍA - Ranking general ────────────────────────────────────────────
export const obtenerRankingPliometria = async (req, res) => {
  try {
    const { periodo = "general", posicion, carrera, limit = 5, tipo } = req.query

    if (tipo && !TIPOS_VALIDOS.includes(tipo))
      return res.status(400).json({ success: false, message: `tipo inválido. Permitidos: ${TIPOS_VALIDOS.join(", ")}` })

    const { fechaInicio, fechaFin } = calcularRangoFechas(periodo)
    const wherePlio = buildWherePliometria(fechaInicio, fechaFin)
    if (tipo) wherePlio.tipo = tipo

    const cuentas = await Cuenta.findAll({
      where: { rol: "jugador", activo: true },
      include: [
        { model: Jugador,    as: "jugador",     where: buildJugadorWhere({ posicion, carrera }), required: true },
        { model: Pliometria, as: "pliometrias", where: wherePlio, required: false },
      ],
    })
    const ranking = cuentas
      .map((c) => {
        const enr = (c.pliometrias || []).map(enriquecerPlio)
        return {
          cuentaId: c.id,
          jugador: { nombres: c.jugador.nombres, apellidos: c.jugador.apellidos, posicion_principal: c.jugador.posicion_principal },
          total_registros:    enr.length,
          mejor_fuerza_total: fmt(enr.reduce((m, r) => Math.max(m, r.fuerzaTotal ?? 0), 0)),
          mejor_altura:       fmt(enr.reduce((m, r) => Math.max(m, r.altura_promedio ?? 0), 0)),
          mejor_cantidad:     enr.reduce((m, r) => Math.max(m, r.cantidad_saltos ?? 0), 0),
        }
      })
      .sort((a, b) => b.mejor_fuerza_total - a.mejor_fuerza_total)
      .slice(0, Number(limit))
    res.json({ success: true, data: { periodo, filtros: { tipo: tipo || "todos" }, top: ranking } })
  } catch (error) {
    console.error("Error obtenerRankingPliometria:", error)
    res.status(500).json({ success: false, message: "Error", error: error.message })
  }
}