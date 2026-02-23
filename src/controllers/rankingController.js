// controllers/rankingController.js
import { Prueba } from "../models/Prueba.js"
import { Cuenta } from "../models/Cuenta.js"
import { Jugador } from "../models/Jugador.js"
import { Op } from "sequelize"

// ─── Rango de fechas ──────────────────────────────────────────────────────────
// Acepta: desde/hasta (ISO strings) con prioridad, o periodo legacy
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
      // Inicio de la semana actual (lunes)
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

// ─── Calcular precisión de una lista de pruebas ───────────────────────────────
// Precisión = (Aciertos / (Aciertos + Fallos)) × 100
// Se calcula como PROMEDIO de la precisión de cada prueba individual
const calcularPrecision = (pruebas) => {
  if (!pruebas || pruebas.length === 0) return 0

  const pruebasConDatos = pruebas.filter((p) => {
    const a = p.cantidad_aciertos || 0
    const e = p.cantidad_errores  || 0
    return (a + e) > 0
  })

  if (pruebasConDatos.length === 0) return 0

  const sumaPrecisiones = pruebasConDatos.reduce((sum, p) => {
    const a = p.cantidad_aciertos || 0
    const e = p.cantidad_errores  || 0
    return sum + (a / (a + e)) * 100
  }, 0)

  return sumaPrecisiones / pruebasConDatos.length
}

// ─── Estadísticas por tipo de prueba ─────────────────────────────────────────
const calcularEstadisticasPorTipo = (pruebas) => {
  const tipos = ["manual", "secuencial", "aleatorio"]
  const resultado = {}

  tipos.forEach((tipo) => {
    const pruebasTipo = pruebas.filter((p) => p.tipo === tipo)
    const aciertos   = pruebasTipo.reduce((s, p) => s + (p.cantidad_aciertos || 0), 0)
    const errores    = pruebasTipo.reduce((s, p) => s + (p.cantidad_errores  || 0), 0)
    const precision  = calcularPrecision(pruebasTipo)

    resultado[tipo] = {
      total_realizadas: pruebasTipo.length,
      total_aciertos:   aciertos,
      total_errores:    errores,
      precision:        Number(precision.toFixed(2)),
    }
  })

  return resultado
}

// ─── Formatear jugador para ranking ──────────────────────────────────────────
const formatearJugador = (cuenta, pruebas) => {
  const totalAciertos = pruebas.reduce((s, p) => s + (p.cantidad_aciertos || 0), 0)
  const totalErrores  = pruebas.reduce((s, p) => s + (p.cantidad_errores  || 0), 0)
  const totalIntentos = pruebas.reduce((s, p) => s + (p.cantidad_intentos || (p.cantidad_aciertos || 0) + (p.cantidad_errores || 0)), 0)
  const precision     = calcularPrecision(pruebas)

  return {
    cuentaId: cuenta.id,
    jugador: {
      id:                  cuenta.jugador.id,
      nombres:             cuenta.jugador.nombres,
      apellidos:           cuenta.jugador.apellidos,
      carrera:             cuenta.jugador.carrera,
      posicion_principal:  cuenta.jugador.posicion_principal,
    },
    totales_generales: {
      total_pruebas:   pruebas.length,
      total_intentos:  totalIntentos,
      total_aciertos:  totalAciertos,
      total_errores:   totalErrores,
      precision:       Number(precision.toFixed(2)),
    },
    por_tipo_prueba: calcularEstadisticasPorTipo(pruebas),
  }
}

// ─── Obtener resultados personales ───────────────────────────────────────────
export const obtenerResultadosPersonales = async (req, res) => {
  try {
    const { cuentaId } = req.params
    const { desde, hasta, periodo = "general" } = req.query
    const { fechaInicio, fechaFin } = calcularRangoFechas(desde, hasta, periodo)

    const pruebas = await Prueba.findAll({
      where: {
        cuentaId,
        estado: "finalizada",
        fecha: { [Op.between]: [fechaInicio, fechaFin] },
      },
      order: [["fecha", "DESC"], ["tiempo_fin", "DESC"]],
    })

    const totalAciertos = pruebas.reduce((s, p) => s + (p.cantidad_aciertos || 0), 0)
    const totalErrores  = pruebas.reduce((s, p) => s + (p.cantidad_errores  || 0), 0)
    const totalIntentos = pruebas.reduce((s, p) => s + (p.cantidad_intentos || (p.cantidad_aciertos || 0) + (p.cantidad_errores || 0)), 0)
    const precision     = calcularPrecision(pruebas)

    const tipos = ["manual", "secuencial", "aleatorio"]
    const estadisticasPorTipo = {}

    const getRatio = (p) => {
      const a = p.cantidad_aciertos || 0
      const e = p.cantidad_errores  || 0
      return (a + e) > 0 ? a / (a + e) : 0
    }

    tipos.forEach((tipo) => {
      const pt = pruebas.filter((p) => p.tipo === tipo)
      const a  = pt.reduce((s, p) => s + (p.cantidad_aciertos || 0), 0)
      const e  = pt.reduce((s, p) => s + (p.cantidad_errores  || 0), 0)

      const ultimaSesion = pt.length > 0 ? pt[0] : null
      const mejorPrueba  = pt.length > 0 ? pt.reduce((best, cur) => getRatio(cur) > getRatio(best) ? cur : best) : null
      const peorPrueba   = pt.length > 0 ? pt.reduce((worst, cur) => getRatio(cur) < getRatio(worst) ? cur : worst) : null

      const fmt = (p) => p ? {
        id:       p.id,
        fecha:    p.fecha,
        aciertos: p.cantidad_aciertos || 0,
        errores:  p.cantidad_errores  || 0,
        intentos: p.cantidad_intentos || (p.cantidad_aciertos || 0) + (p.cantidad_errores || 0),
        precision: Number(((getRatio(p)) * 100).toFixed(2)),
      } : null

      estadisticasPorTipo[tipo] = {
        total_realizadas: pt.length,
        total_aciertos:   a,
        total_errores:    e,
        precision:        Number(calcularPrecision(pt).toFixed(2)),
        ultima_sesion:    fmt(ultimaSesion),
        mejor_prueba:     fmt(mejorPrueba),
        peor_prueba:      fmt(peorPrueba),
      }
    })

    res.json({
      success: true,
      data: {
        rango: { desde: fechaInicio, hasta: fechaFin },
        totales_generales: {
          total_pruebas:  pruebas.length,
          total_intentos: totalIntentos,
          total_aciertos: totalAciertos,
          total_errores:  totalErrores,
          precision:      Number(precision.toFixed(2)),
        },
        por_tipo_prueba: estadisticasPorTipo,
      },
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, message: "Error al obtener resultados personales", error: error.message })
  }
}

// ─── Obtener ranking general ──────────────────────────────────────────────────
// Ordena por PRECISIÓN PROMEDIO (Aciertos / (Aciertos + Fallos) × 100)
// Devuelve TODOS los jugadores (no solo top 5) para poder mostrar cualquier posición
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
          model: Prueba,
          as: "pruebas",
          where: { estado: "finalizada", fecha: { [Op.between]: [fechaInicio, fechaFin] } },
          required: false,
        },
      ],
    })

    const jugadoresConEstadisticas = cuentas.map((cuenta) =>
      formatearJugador(cuenta, cuenta.pruebas || [])
    )

    // Ordenar por precisión promedio DESC
    const rankingCompleto = jugadoresConEstadisticas.sort(
      (a, b) => b.totales_generales.precision - a.totales_generales.precision
    )

    const topN = rankingCompleto.slice(0, Number(limite))

    res.json({
      success: true,
      data: {
        periodo,
        rango:          { desde: fechaInicio, hasta: fechaFin },
        filtros:        { posicion: posicion || "todas", carrera: carrera || "todas" },
        total_jugadores: rankingCompleto.length,
        ranking:        topN,
        // Mantenemos top_5 por compatibilidad con código existente
        top_5:          rankingCompleto.slice(0, 5),
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
          model: Prueba,
          as: "pruebas",
          where: { estado: "finalizada", fecha: { [Op.between]: [fechaInicio, fechaFin] } },
          required: false,
        },
      ],
    })

    const jugadoresConEstadisticas = cuentas.map((cuenta) =>
      formatearJugador(cuenta, cuenta.pruebas || [])
    )

    // Ordenar por precisión DESC
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
        rango:           { desde: fechaInicio, hasta: fechaFin },
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