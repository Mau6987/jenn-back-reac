// controllers/rankingController.js
import { Reaccion } from "../models/Reaccion.js"
import { Cuenta } from "../models/Cuenta.js"
import { Jugador } from "../models/Jugador.js"
import { Op } from "sequelize"

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
    case "semanal":
      fechaInicio = new Date(ahora)
      const dayOfWeek = ahora.getDay() === 0 ? 6 : ahora.getDay() - 1
      fechaInicio.setDate(ahora.getDate() - dayOfWeek)
      fechaInicio.setHours(0, 0, 0, 0)
      break
    case "mensual":
      fechaInicio = new Date(ahora.getFullYear(), ahora.getMonth(), 1)
      break
    default: // "general"
      fechaInicio = new Date(0)
  }

  return { fechaInicio, fechaFin: ahora }
}

// ─── Calcular precisión de una lista de reacciones ───────────────────────────
const calcularPrecision = (reacciones) => {
  if (!reacciones || reacciones.length === 0) return 0

  const reaccionesConDatos = reacciones.filter((r) => {
    const a = r.cantidad_aciertos || 0
    const e = r.cantidad_errores  || 0
    return (a + e) > 0
  })

  if (reaccionesConDatos.length === 0) return 0

  const sumaPrecisiones = reaccionesConDatos.reduce((sum, r) => {
    const a = r.cantidad_aciertos || 0
    const e = r.cantidad_errores  || 0
    return sum + (a / (a + e)) * 100
  }, 0)

  return sumaPrecisiones / reaccionesConDatos.length
}

// ─── Estadísticas por tipo de reacción ───────────────────────────────────────
const calcularEstadisticasPorTipo = (reacciones) => {
  const tipos = ["manual", "secuencial", "aleatorio"]
  const resultado = {}

  tipos.forEach((tipo) => {
    const reaccionesTipo = reacciones.filter((r) => r.tipo === tipo)
    const aciertos  = reaccionesTipo.reduce((s, r) => s + (r.cantidad_aciertos || 0), 0)
    const errores   = reaccionesTipo.reduce((s, r) => s + (r.cantidad_errores  || 0), 0)
    const precision = calcularPrecision(reaccionesTipo)

    resultado[tipo] = {
      total_realizadas: reaccionesTipo.length,
      total_aciertos:   aciertos,
      total_errores:    errores,
      precision:        Number(precision.toFixed(2)),
    }
  })

  return resultado
}

// ─── Formatear jugador para ranking ──────────────────────────────────────────
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

// ─── Obtener resultados personales ───────────────────────────────────────────
export const obtenerResultadosPersonales = async (req, res) => {
  try {
    const { cuentaId } = req.params
    const { desde, hasta, periodo = "general" } = req.query
    const { fechaInicio, fechaFin } = calcularRangoFechas(desde, hasta, periodo)

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

    const tipos = ["manual", "secuencial", "aleatorio"]
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
        id:       r.id,
        fecha:    r.fecha,
        aciertos: r.cantidad_aciertos || 0,
        errores:  r.cantidad_errores  || 0,
        intentos: r.cantidad_intentos || (r.cantidad_aciertos || 0) + (r.cantidad_errores || 0),
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
    res.status(500).json({ success: false, message: "Error al obtener resultados personales", error: error.message })
  }
}

// ─── Obtener ranking general ──────────────────────────────────────────────────
export const obtenerRankingGeneral = async (req, res) => {
  try {
    const { desde, hasta, periodo = "general", posicion, carrera, limite = 10 } = req.query
    const { fechaInicio, fechaFin } = calcularRangoFechas(desde, hasta, periodo)

    const filtrosJugador = {}
    if (posicion) filtrosJugador.posicion_principal = posicion
    if (carrera)  filtrosJugador.carrera = carrera

    const cuentas = await Cuenta.findAll({
      where: { rol: "jugador", activo: true },
      include: [
        { model: Jugador, as: "jugador", where: filtrosJugador, required: true },
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

    const rankingCompleto = jugadoresConEstadisticas.sort(
      (a, b) => b.totales_generales.precision - a.totales_generales.precision
    )

    const topN = rankingCompleto.slice(0, Number(limite))

    res.json({
      success: true,
      data: {
        periodo,
        rango:           { desde: fechaInicio, hasta: fechaFin },
        filtros:         { posicion: posicion || "todas", carrera: carrera || "todas" },
        total_jugadores: rankingCompleto.length,
        ranking:         topN,
        top_5:           rankingCompleto.slice(0, 5),
      },
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, message: "Error al obtener ranking general", error: error.message })
  }
}

// ─── Obtener posición del usuario en el ranking ───────────────────────────────
export const obtenerPosicionUsuario = async (req, res) => {
  try {
    const { cuentaId } = req.params
    const { desde, hasta, periodo = "general", posicion, carrera } = req.query
    const { fechaInicio, fechaFin } = calcularRangoFechas(desde, hasta, periodo)

    const filtrosJugador = {}
    if (posicion) filtrosJugador.posicion_principal = posicion
    if (carrera)  filtrosJugador.carrera = carrera

    const cuentas = await Cuenta.findAll({
      where: { rol: "jugador", activo: true },
      include: [
        { model: Jugador, as: "jugador", where: filtrosJugador, required: true },
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

    const rankingCompleto = jugadoresConEstadisticas.sort(
      (a, b) => b.totales_generales.precision - a.totales_generales.precision
    )

    const posicionUsuario = rankingCompleto.findIndex(
      (j) => j.cuentaId === Number.parseInt(cuentaId)
    )

    if (posicionUsuario === -1) {
      return res.status(404).json({ success: false, message: "Usuario no encontrado en el ranking" })
    }

    res.json({
      success: true,
      data: {
        periodo,
        rango:            { desde: fechaInicio, hasta: fechaFin },
        posicion_ranking: posicionUsuario + 1,
        total_jugadores:  rankingCompleto.length,
        usuario:          rankingCompleto[posicionUsuario],
      },
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, message: "Error al obtener posición del usuario", error: error.message })
  }
}