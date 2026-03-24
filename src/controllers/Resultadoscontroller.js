// controllers/resultadosController.js  ← VERSIÓN AMPLIADA
// Agrega obtenerSesionesPersonales al controlador existente.
// Las funciones ya existentes (obtenerResultadosPersonales, obtenerResultadosGeneral,
// obtenerPosicionUsuario) no se modifican.

import { Reaccion } from "../models/Reaccion.js"
import { Cuenta }   from "../models/Cuenta.js"
import { Jugador }  from "../models/Jugador.js"
import { Op }       from "sequelize"

// ─── Rango de fechas ──────────────────────────────────────────────────────────
const calcularRangoFechas = (desde, hasta, periodo) => {
  const ahora = new Date()

  if (desde || hasta) {
    return {
      fechaInicio: desde ? new Date(desde) : new Date(0),
      fechaFin:    hasta ? new Date(hasta) : ahora,
    }
  }

  let fechaInicio
  switch (periodo) {
    case "semanal": {
      fechaInicio = new Date(ahora)
      const dayOfWeek = ahora.getDay() === 0 ? 6 : ahora.getDay() - 1
      fechaInicio.setDate(ahora.getDate() - dayOfWeek)
      fechaInicio.setHours(0, 0, 0, 0)
      break
    }
    case "mensual":
      fechaInicio = new Date(ahora.getFullYear(), ahora.getMonth(), 1)
      break
    default:   // "general"
      fechaInicio = new Date(0)
  }

  return { fechaInicio, fechaFin: ahora }
}

// ─── Calcular precisión de una lista de reacciones ───────────────────────────
const calcularPrecision = (reacciones) => {
  if (!reacciones?.length) return 0
  const conDatos = reacciones.filter((r) => (r.cantidad_aciertos || 0) + (r.cantidad_errores || 0) > 0)
  if (!conDatos.length) return 0
  const suma = conDatos.reduce((s, r) => {
    const a = r.cantidad_aciertos || 0
    const e = r.cantidad_errores  || 0
    return s + (a / (a + e)) * 100
  }, 0)
  return suma / conDatos.length
}

// ─── Estadísticas por tipo ────────────────────────────────────────────────────
const calcularEstadisticasPorTipo = (reacciones) => {
  const tipos    = ["manual", "secuencial", "aleatorio"]
  const resultado = {}

  tipos.forEach((tipo) => {
    const rt        = reacciones.filter((r) => r.tipo === tipo)
    const aciertos  = rt.reduce((s, r) => s + (r.cantidad_aciertos || 0), 0)
    const errores   = rt.reduce((s, r) => s + (r.cantidad_errores  || 0), 0)
    const precision = calcularPrecision(rt)
    resultado[tipo] = {
      total_realizadas: rt.length,
      total_aciertos:   aciertos,
      total_errores:    errores,
      precision:        Number(precision.toFixed(2)),
    }
  })

  return resultado
}

// ─── Formatear jugador para resultados ──────────────────────────────────────────
const formatearJugador = (cuenta, reacciones) => {
  const totalAciertos = reacciones.reduce((s, r) => s + (r.cantidad_aciertos || 0), 0)
  const totalErrores  = reacciones.reduce((s, r) => s + (r.cantidad_errores  || 0), 0)
  const totalIntentos = reacciones.reduce((s, r) => s + (r.cantidad_intentos || (r.cantidad_aciertos || 0) + (r.cantidad_errores || 0)), 0)
  const precision     = calcularPrecision(reacciones)

  return {
    cuentaId: cuenta.id,
    jugador: {
      id:                 cuenta.jugador.id,
      nombres:            cuenta.jugador.nombres,
      apellidos:          cuenta.jugador.apellidos,
      carrera:            cuenta.jugador.carrera,
      posicion_principal: cuenta.jugador.posicion_principal,
    },
    totales_generales: {
      total_reacciones: reacciones.length,
      total_intentos:   totalIntentos,
      total_aciertos:   totalAciertos,
      total_errores:    totalErrores,
      precision:        Number(precision.toFixed(2)),
    },
    por_tipo_reaccion: calcularEstadisticasPorTipo(reacciones),
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ENDPOINT: GET /api/resultados/personal/:cuentaId
// Query params: desde?, hasta?, periodo?
// ─── Resultados personales ────────────────────────────────────────────────────
export const obtenerResultadosPersonales = async (req, res) => {
  try {
    const { cuentaId }                  = req.params
    const { desde, hasta, periodo = "general" } = req.query
    const { fechaInicio, fechaFin }     = calcularRangoFechas(desde, hasta, periodo)

    const reacciones = await Reaccion.findAll({
      where: {
        cuentaId,
        estado: "finalizada",
        fecha: { [Op.between]: [fechaInicio, fechaFin] },
      },
      order: [["fecha", "DESC"], ["tiempo_fin", "DESC"]],
    })

    const totalAciertos = reacciones.reduce((s, r) => s + (r.cantidad_aciertos || 0), 0)
    const totalErrores  = reacciones.reduce((s, r) => s + (r.cantidad_errores  || 0), 0)
    const totalIntentos = reacciones.reduce((s, r) => s + (r.cantidad_intentos || (r.cantidad_aciertos || 0) + (r.cantidad_errores || 0)), 0)
    const precision     = calcularPrecision(reacciones)

    const tipos               = ["manual", "secuencial", "aleatorio"]
    const estadisticasPorTipo = {}

    const getRatio = (r) => {
      const a = r.cantidad_aciertos || 0
      const e = r.cantidad_errores  || 0
      return (a + e) > 0 ? a / (a + e) : 0
    }

    tipos.forEach((tipo) => {
      const rt = reacciones.filter((r) => r.tipo === tipo)
      const a  = rt.reduce((s, r) => s + (r.cantidad_aciertos || 0), 0)
      const e  = rt.reduce((s, r) => s + (r.cantidad_errores  || 0), 0)

      const ultimaSesion  = rt.length > 0 ? rt[0] : null
      const mejorReaccion = rt.length > 0 ? rt.reduce((best, cur) => getRatio(cur) > getRatio(best) ? cur : best) : null
      const peorReaccion  = rt.length > 0 ? rt.reduce((worst, cur) => getRatio(cur) < getRatio(worst) ? cur : worst) : null

      const fmt = (r) => r ? {
        id:        r.id,
        fecha:     r.fecha,
        aciertos:  r.cantidad_aciertos || 0,
        errores:   r.cantidad_errores  || 0,
        intentos:  r.cantidad_intentos || (r.cantidad_aciertos || 0) + (r.cantidad_errores || 0),
        precision: Number(((getRatio(r)) * 100).toFixed(2)),
      } : null

      estadisticasPorTipo[tipo] = {
        total_realizadas: rt.length,
        total_aciertos:   a,
        total_errores:    e,
        precision:        Number(calcularPrecision(rt).toFixed(2)),
        ultima_sesion:    fmt(ultimaSesion),
        mejor_reaccion:   fmt(mejorReaccion),
        peor_reaccion:    fmt(peorReaccion),
      }
    })

    res.json({
      success: true,
      data: {
        rango: { desde: fechaInicio, hasta: fechaFin },
        totales_generales: {
          total_reacciones: reacciones.length,
          total_intentos:   totalIntentos,
          total_aciertos:   totalAciertos,
          total_errores:    totalErrores,
          precision:        Number(precision.toFixed(2)),
        },
        por_tipo_reaccion: estadisticasPorTipo,
      },
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({
      success: false,
      message: "Error al obtener resultados personales",
      error: error.message,
    })
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ENDPOINT NUEVO: GET /api/resultados/personal/:cuentaId/sesiones
// Devuelve todas las sesiones individuales (una fila por reacción) dentro del
// rango solicitado para alimentar la tabla del frontend.
// Query params: desde?, hasta?, periodo?, tipo?
// ─── Sesiones individuales ────────────────────────────────────────────────────
export const obtenerSesionesPersonales = async (req, res) => {
  try {
    const { cuentaId }                               = req.params
    const { desde, hasta, periodo = "general", tipo } = req.query
    const { fechaInicio, fechaFin }                  = calcularRangoFechas(desde, hasta, periodo)

    const where = {
      cuentaId,
      estado: "finalizada",
      fecha:  { [Op.between]: [fechaInicio, fechaFin] },
    }
    if (tipo && ["manual", "secuencial", "aleatorio"].includes(tipo)) {
      where.tipo = tipo
    }

    const reacciones = await Reaccion.findAll({
      where,
      order: [["fecha", "DESC"], ["tiempo_fin", "DESC"]],
    })

    const sesiones = reacciones.map((r) => {
      const aciertos = r.cantidad_aciertos || 0
      const errores  = r.cantidad_errores  || 0
      const intentos = r.cantidad_intentos || aciertos + errores
      const precision = intentos > 0 ? Number(((aciertos / intentos) * 100).toFixed(2)) : 0

      return {
        id:         r.id,
        fecha:      r.fecha,
        modo:       r.tipo,
        intentos,
        aciertos,
        errores,
        precision,
        tiempo_inicio: r.tiempo_inicio,
        tiempo_fin:    r.tiempo_fin,
      }
    })

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
    res.status(500).json({
      success: false,
      message: "Error al obtener sesiones personales",
      error: error.message,
    })
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ENDPOINT: GET /api/resultados/general
// ─── Resultados general ──────────────────────────────────────────────────────────
export const obtenerResultadosGeneral = async (req, res) => {
  try {
    const { desde, hasta, periodo = "general", posicion, carrera, limite = 10 } = req.query
    const { fechaInicio, fechaFin } = calcularRangoFechas(desde, hasta, periodo)

    const filtrosJugador = {}
    if (posicion) filtrosJugador.posicion_principal = posicion
    if (carrera)  filtrosJugador.carrera = carrera

    const cuentas = await Cuenta.findAll({
      where: { rol: "jugador", activo: true },
      include: [
        { model: Jugador,   as: "jugador",    where: filtrosJugador, required: true },
        {
          model: Reaccion,
          as: "reacciones",
          where: { estado: "finalizada", fecha: { [Op.between]: [fechaInicio, fechaFin] } },
          required: false,
        },
      ],
    })

    const jugadoresConEstadisticas = cuentas.map((cuenta) =>
      formatearJugador(cuenta, cuenta.reacciones || [])
    )

    const resultadosCompleto = jugadoresConEstadisticas.sort(
      (a, b) => b.totales_generales.precision - a.totales_generales.precision
    )

    const topN = resultadosCompleto.slice(0, Number(limite))

    res.json({
      success: true,
      data: {
        periodo,
        rango:           { desde: fechaInicio, hasta: fechaFin },
        filtros:         { posicion: posicion || "todas", carrera: carrera || "todas" },
        total_jugadores: resultadosCompleto.length,
        resultados:         topN,
        top_5:           resultadosCompleto.slice(0, 5),
      },
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({
      success: false,
      message: "Error al obtener resultados general",
      error: error.message,
    })
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ENDPOINT: GET /api/resultados/posicion/:cuentaId
// ─── Posición del usuario en el resultados ──────────────────────────────────────
export const obtenerPosicionUsuario = async (req, res) => {
  try {
    const { cuentaId }                                          = req.params
    const { desde, hasta, periodo = "general", posicion, carrera } = req.query
    const { fechaInicio, fechaFin }                            = calcularRangoFechas(desde, hasta, periodo)

    const filtrosJugador = {}
    if (posicion) filtrosJugador.posicion_principal = posicion
    if (carrera)  filtrosJugador.carrera = carrera

    const cuentas = await Cuenta.findAll({
      where: { rol: "jugador", activo: true },
      include: [
        { model: Jugador,  as: "jugador",    where: filtrosJugador, required: true },
        {
          model: Reaccion,
          as: "reacciones",
          where: { estado: "finalizada", fecha: { [Op.between]: [fechaInicio, fechaFin] } },
          required: false,
        },
      ],
    })

    const jugadoresConEstadisticas = cuentas.map((cuenta) =>
      formatearJugador(cuenta, cuenta.reacciones || [])
    )

    const resultadosCompleto = jugadoresConEstadisticas.sort(
      (a, b) => b.totales_generales.precision - a.totales_generales.precision
    )

    const posicionUsuario = resultadosCompleto.findIndex(
      (j) => j.cuentaId === Number.parseInt(cuentaId)
    )

    if (posicionUsuario === -1) {
      return res.status(404).json({ success: false, message: "Usuario no encontrado en el resultados" })
    }

    res.json({
      success: true,
      data: {
        periodo,
        rango:            { desde: fechaInicio, hasta: fechaFin },
        posicion_resultados: posicionUsuario + 1,
        total_jugadores:  resultadosCompleto.length,
        usuario:          resultadosCompleto[posicionUsuario],
      },
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({
      success: false,
      message: "Error al obtener posición del usuario",
      error: error.message,
    })
  }
}