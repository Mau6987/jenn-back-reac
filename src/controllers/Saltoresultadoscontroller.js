// controllers/saltoResultadosController.js
import { Salto }  from "../models/Salto.js"
import { Cuenta } from "../models/Cuenta.js"
import { Jugador } from "../models/Jugador.js"
import { Op }     from "sequelize"

// ─── Helpers ──────────────────────────────────────────────────────────────────

const calcularRangoFechas = (desde, hasta, periodo) => {
  const ahora = new Date()
  if (desde || hasta) {
    return {
      fechaInicio: desde ? new Date(desde) : new Date(0),
      fechaFin:    hasta ? new Date(hasta)  : ahora,
    }
  }
  let fechaInicio
  switch (periodo) {
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
      fechaInicio = new Date(0)
  }
  return { fechaInicio, fechaFin: ahora }
}

// Estadísticas de un array de saltos
const calcularStats = (saltos) => {
  if (!saltos.length) return {
    cantidad: 0,
    altura_promedio: 0,
    fuerza_max_promedio: 0,
    indice_fatiga_promedio: 0,
    total_saltos: 0,
  }
  const n = saltos.length
  return {
    cantidad: n,
    altura_promedio:       +(saltos.reduce((s, r) => s + (r.altura_promedio || 0), 0) / n).toFixed(2),
    fuerza_max_promedio:   +(saltos.reduce((s, r) => s + Math.max(r.fuerzaizquierda || 0, r.fuerzaderecha || 0), 0) / n).toFixed(2),
    indice_fatiga_promedio:+(saltos.reduce((s, r) => s + (r.indice_fatiga || 0), 0) / n).toFixed(2),
    total_saltos:           saltos.reduce((s, r) => s + (r.cantidad_saltos || 0), 0),
  }
}

// ─── GET /api/saltos/resultados/personal/:cuentaId ────────────────────────────
// Resumen estadístico + por tipo para una jugadora
export const obtenerResultadosSaltoPersonal = async (req, res) => {
  try {
    const { cuentaId }                          = req.params
    const { desde, hasta, periodo = "general" } = req.query
    const { fechaInicio, fechaFin }             = calcularRangoFechas(desde, hasta, periodo)

    const saltos = await Salto.findAll({
      where: {
        cuentaId,
        estado: "finalizada",
        fecha: { [Op.between]: [fechaInicio, fechaFin] },
      },
      order: [["fecha", "DESC"]],
    })

    const tipos = ["salto simple", "salto conos"]
    const por_tipo = {}
    tipos.forEach(tipo => {
      const sub = saltos.filter(s => s.tipo === tipo)
      por_tipo[tipo] = {
        ...calcularStats(sub),
        mejor_salto: sub.length
          ? sub.reduce((b, s) => (s.altura_promedio > b.altura_promedio ? s : b))
          : null,
      }
    })

    res.json({
      success: true,
      data: {
        rango: { desde: fechaInicio, hasta: fechaFin },
        totales: calcularStats(saltos),
        por_tipo,
      },
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, message: "Error al obtener resultados de salto", error: error.message })
  }
}

// ─── GET /api/saltos/resultados/personal/:cuentaId/sesiones ──────────────────
// Lista detallada de cada sesión de salto de una jugadora
export const obtenerSesionesSalto = async (req, res) => {
  try {
    const { cuentaId }                               = req.params
    const { desde, hasta, periodo = "general", tipo } = req.query
    const { fechaInicio, fechaFin }                  = calcularRangoFechas(desde, hasta, periodo)

    const where = {
      cuentaId,
      estado: "finalizada",
      fecha:  { [Op.between]: [fechaInicio, fechaFin] },
    }
    if (tipo && ["salto simple", "salto conos"].includes(tipo)) {
      where.tipo = tipo
    }

    const saltos = await Salto.findAll({ where, order: [["fecha", "DESC"]] })

    const sesiones = saltos.map(s => ({
      id:              s.id,
      fecha:           s.fecha,
      tipo:            s.tipo,
      tiempo:          s.tiempo,
      fuerzaizquierda: s.fuerzaizquierda,
      fuerzaderecha:   s.fuerzaderecha,
      fuerza_max:      Math.max(s.fuerzaizquierda || 0, s.fuerzaderecha || 0),
      aceleracion:     s.aceleracion,
      potencia:        s.potencia,
      cantidad_saltos: s.cantidad_saltos,
      indice_fatiga:   s.indice_fatiga,
      altura_promedio: s.altura_promedio,
    }))

    res.json({
      success: true,
      data: {
        rango:    { desde: fechaInicio, hasta: fechaFin },
        total:    sesiones.length,
        sesiones,
      },
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, message: "Error al obtener sesiones de salto", error: error.message })
  }
}

// ─── GET /api/saltos/resultados/personal/:cuentaId/chart ─────────────────────
// Datos para el gráfico de evolución semanal
export const obtenerChartSalto = async (req, res) => {
  try {
    const { cuentaId } = req.params
    const { desde, hasta } = req.query

    const { fechaInicio, fechaFin } = calcularRangoFechas(desde, hasta, "general")

    const saltos = await Salto.findAll({
      where: {
        cuentaId,
        estado: "finalizada",
        fecha: { [Op.between]: [fechaInicio, fechaFin] },
      },
      order: [["fecha", "ASC"]],
    })

    const tipos = ["salto simple", "salto conos"]
    const result = {}
    tipos.forEach(tipo => {
      const sub = saltos.filter(s => s.tipo === tipo)
      result[tipo] = {
        altura_promedio:        sub.length ? +(sub.reduce((a, s) => a + (s.altura_promedio || 0), 0) / sub.length).toFixed(2) : 0,
        fuerza_max_promedio:    sub.length ? +(sub.reduce((a, s) => a + Math.max(s.fuerzaizquierda || 0, s.fuerzaderecha || 0), 0) / sub.length).toFixed(2) : 0,
        indice_fatiga_promedio: sub.length ? +(sub.reduce((a, s) => a + (s.indice_fatiga || 0), 0) / sub.length).toFixed(2) : 0,
        total: sub.length,
      }
    })

    res.json({ success: true, data: result })
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, message: "Error al obtener chart de salto", error: error.message })
  }
}

// ─── GET /api/saltos/resultados/general ──────────────────────────────────────
// Resultados de todas las jugadoras (para el sidebar con KPI rápido)
export const obtenerResultadosSaltoGeneral = async (req, res) => {
  try {
    const { desde, hasta, periodo = "general" } = req.query
    const { fechaInicio, fechaFin }             = calcularRangoFechas(desde, hasta, periodo)

    const cuentas = await Cuenta.findAll({
      where: { rol: "jugador", activo: true },
      include: [
        { model: Jugador, as: "jugador", required: true },
        {
          model: Salto,
          as: "saltos",
          where: { estado: "finalizada", fecha: { [Op.between]: [fechaInicio, fechaFin] } },
          required: false,
        },
      ],
    })

    const data = cuentas.map(c => {
      const saltos = c.saltos || []
      return {
        cuentaId: c.id,
        path:     c.path || "",
        jugador:  {
          id:                 c.jugador.id,
          nombres:            c.jugador.nombres,
          apellidos:          c.jugador.apellidos,
          posicion_principal: c.jugador.posicion_principal,
          carrera:            c.jugador.carrera,
        },
        ...calcularStats(saltos),
      }
    })

    res.json({ success: true, data })
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, message: "Error al obtener resultados generales de salto", error: error.message })
  }
}