// controllers/panelJugadoraController.js
// Endpoints específicos para el componente JugadoraDetallePanel
// Complementa los controladores existentes sin duplicarlos.

import { Reaccion } from "../models/Reaccion.js"
import { Salto }    from "../models/Salto.js"
import { Jugador }  from "../models/Jugador.js"
import { Cuenta }   from "../models/Cuenta.js"
import { Op }       from "sequelize"

// ─── Helpers ───────────────────────────────────────────────────────────────────

const calcPct = (aciertos, intentos) =>
  intentos > 0 ? parseFloat(((aciertos / intentos) * 100).toFixed(1)) : 0

const buildFechaWhere = (desde, hasta) => {
  if (!desde && !hasta) return {}
  const cond = {}
  if (desde) cond[Op.gte] = new Date(desde + "T00:00:00")
  if (hasta) cond[Op.lte] = new Date(hasta + "T23:59:59")
  return { fecha: cond }
}

// ─── GET /api/panel/jugadora/:cuentaId
// Header del panel: perfil + fecha de última prueba
// Reutiliza Jugador + Cuenta y agrega la fecha más reciente entre pruebas
export const obtenerCabeceraPanel = async (req, res) => {
  try {
    const { cuentaId } = req.params

    const jugador = await Jugador.findOne({
      where: { cuentaId },
      include: [{ model: Cuenta, as: "cuenta", attributes: ["id", "usuario", "activo", "path"] }],
    })

    if (!jugador) {
      return res.status(404).json({ success: false, message: "Jugadora no encontrada" })
    }

    // Fecha más reciente entre reacción finalizada y salto finalizado
    const [ultimaReaccion, ultimoSalto] = await Promise.all([
      Reaccion.findOne({
        where: { cuentaId, estado: "finalizada" },
        order: [["fecha", "DESC"]],
        attributes: ["fecha"],
      }),
      Salto.findOne({
        where: { cuentaId, estado: "finalizada" },
        order: [["fecha", "DESC"]],
        attributes: ["fecha"],
      }),
    ])

    const fechas = [ultimaReaccion?.fecha, ultimoSalto?.fecha]
      .filter(Boolean)
      .map((f) => new Date(f))

    const ultimaPrueba = fechas.length > 0 ? new Date(Math.max(...fechas)) : null

    return res.json({
      success: true,
      data: { jugador, ultimaPrueba },
    })
  } catch (error) {
    console.error("obtenerCabeceraPanel:", error)
    return res.status(500).json({ success: false, message: "Error al obtener cabecera del panel" })
  }
}

// ─── GET /api/panel/jugadora/:cuentaId/reaccion
// Tab Reacción: KPIs + chart data + tabla detallada
// Query params: desde (YYYY-MM-DD), hasta (YYYY-MM-DD)
export const obtenerDatosReaccionPanel = async (req, res) => {
  try {
    const { cuentaId } = req.params
    const { desde, hasta } = req.query

    const sesiones = await Reaccion.findAll({
      where: { cuentaId, estado: "finalizada", ...buildFechaWhere(desde, hasta) },
      order: [["fecha", "ASC"]],
    })

    if (!sesiones.length) {
      return res.json({
        success: true,
        data: { kpis: null, chart: [], sesiones: [] },
      })
    }

    // ── KPI 1: % aciertos general ─────────────────────────────────────────────
    const totalIntentos = sesiones.reduce((s, r) => s + (r.cantidad_intentos || 0), 0)
    const totalAciertos = sesiones.reduce((s, r) => s + (r.cantidad_aciertos || 0), 0)
    const pctGeneral = calcPct(totalAciertos, totalIntentos)

    // ── KPI 2: mejor modo (mayor % promedio de aciertos) ──────────────────────
    const MODOS = ["manual", "secuencial", "aleatorio"]
    const mejorModo = MODOS.map((modo) => {
      const del_modo = sesiones.filter((s) => s.tipo === modo)
      if (!del_modo.length) return { modo, pct: 0 }
      const a = del_modo.reduce((s, r) => s + (r.cantidad_aciertos || 0), 0)
      const i = del_modo.reduce((s, r) => s + (r.cantidad_intentos || 0), 0)
      return { modo, pct: calcPct(a, i) }
    }).sort((a, b) => b.pct - a.pct)[0]

    // ── KPI 3: tendencia últimas 3 sesiones vs las 3 anteriores ──────────────
    let tendencia = null
    if (sesiones.length >= 4) {
      const ult3  = sesiones.slice(-3)
      const prev3 = sesiones.slice(-6, -3)
      const avgUlt  = ult3.reduce((s, r) => s + calcPct(r.cantidad_aciertos, r.cantidad_intentos), 0) / ult3.length
      const avgPrev = prev3.length
        ? prev3.reduce((s, r) => s + calcPct(r.cantidad_aciertos, r.cantidad_intentos), 0) / prev3.length
        : avgUlt
      tendencia = parseFloat((avgUlt - avgPrev).toFixed(1))
    }

    // ── Chart: un punto por sesión, % separado por modo ───────────────────────
    // El front necesita nulls donde no hay valor para no unir líneas
    const chart = sesiones.map((s, idx) => ({
      sesion:     idx + 1,
      fecha:      s.fecha,
      modo:       s.tipo,
      aleatorio:  s.tipo === "aleatorio"  ? calcPct(s.cantidad_aciertos, s.cantidad_intentos) : null,
      secuencial: s.tipo === "secuencial" ? calcPct(s.cantidad_aciertos, s.cantidad_intentos) : null,
      manual:     s.tipo === "manual"     ? calcPct(s.cantidad_aciertos, s.cantidad_intentos) : null,
    }))

    // ── Tabla detallada ───────────────────────────────────────────────────────
    const tabla = sesiones.map((s, idx) => ({
      id:       s.id,
      sesion:   idx + 1,
      fecha:    s.fecha,
      modo:     s.tipo,
      intentos: s.cantidad_intentos,
      aciertos: s.cantidad_aciertos,
      fallos:   s.cantidad_errores,
      pct:      calcPct(s.cantidad_aciertos, s.cantidad_intentos),
    }))

    return res.json({
      success: true,
      data: {
        kpis: {
          pctGeneral,
          mejorModo:      mejorModo.modo,
          tendencia,
          totalSesiones:  sesiones.length,
        },
        chart,
        sesiones: tabla,
      },
    })
  } catch (error) {
    console.error("obtenerDatosReaccionPanel:", error)
    return res.status(500).json({ success: false, message: "Error al obtener datos de reacción" })
  }
}

// ─── GET /api/panel/jugadora/:cuentaId/salto
// Tab Salto: KPIs + chart data + tabla detallada
// Query params: desde, hasta, tipo ("salto simple" | "salto conos")
export const obtenerDatosSaltoPanel = async (req, res) => {
  try {
    const { cuentaId } = req.params
    const { desde, hasta, tipo } = req.query

    const where = {
      cuentaId,
      estado: "finalizada",
      ...buildFechaWhere(desde, hasta),
    }
    if (tipo) where.tipo = tipo

    const sesiones = await Salto.findAll({ where, order: [["fecha", "ASC"]] })

    if (!sesiones.length) {
      return res.json({
        success: true,
        data: { kpis: null, chart: [], sesiones: [] },
      })
    }

    // ── KPIs ──────────────────────────────────────────────────────────────────

    // Altura promedio general (promedio de los altura_promedio de cada sesión)
    const alturaPromedio = parseFloat(
      (sesiones.reduce((s, r) => s + (r.altura_promedio || 0), 0) / sesiones.length).toFixed(1)
    )

    // Fuerza máxima promedio: max entre izq y der por sesión, luego promedio
    const fuerzasMax = sesiones.map((s) => Math.max(s.fuerzaizquierda || 0, s.fuerzaderecha || 0))
    const fuerzaMaxProm = parseFloat(
      (fuerzasMax.reduce((a, b) => a + b, 0) / fuerzasMax.length).toFixed(1)
    )

    // Índice de fatiga promedio
    const indiceFatigaProm = parseFloat(
      (sesiones.reduce((s, r) => s + (r.indice_fatiga || 0), 0) / sesiones.length).toFixed(1)
    )

    // Total de saltos realizados (suma de cantidad_saltos)
    const totalSaltos = sesiones.reduce((s, r) => s + (r.cantidad_saltos || 0), 0)

    // ── Chart ─────────────────────────────────────────────────────────────────
    // vertical = salto simple, cono = salto conos
    const chart = sesiones.map((s, idx) => ({
      sesion:   idx + 1,
      fecha:    s.fecha,
      tipo:     s.tipo,
      vertical: s.tipo === "salto simple" ? parseFloat((s.altura_promedio || 0).toFixed(1)) : null,
      cono:     s.tipo === "salto conos"  ? parseFloat((s.altura_promedio || 0).toFixed(1)) : null,
      fuerza:   parseFloat(Math.max(s.fuerzaizquierda || 0, s.fuerzaderecha || 0).toFixed(1)),
    }))

    // ── Tabla detallada ───────────────────────────────────────────────────────
    const tabla = sesiones.map((s, idx) => ({
      id:         s.id,
      sesion:     idx + 1,
      fecha:      s.fecha,
      tipo:       s.tipo,
      alturaP:    parseFloat((s.altura_promedio  || 0).toFixed(1)),
      fuerzaMax:  parseFloat(Math.max(s.fuerzaizquierda || 0, s.fuerzaderecha || 0).toFixed(1)),
      fatiga:     parseFloat((s.indice_fatiga    || 0).toFixed(1)),
      saltos:     s.cantidad_saltos,
      potencia:   parseFloat((s.potencia         || 0).toFixed(2)),
      aceleracion:parseFloat((s.aceleracion      || 0).toFixed(2)),
    }))

    return res.json({
      success: true,
      data: {
        kpis: {
          alturaPromedio,
          fuerzaMaxProm,
          indiceFatigaProm,
          totalSaltos,
          totalSesiones: sesiones.length,
        },
        chart,
        sesiones: tabla,
      },
    })
  } catch (error) {
    console.error("obtenerDatosSaltoPanel:", error)
    return res.status(500).json({ success: false, message: "Error al obtener datos de salto" })
  }
}