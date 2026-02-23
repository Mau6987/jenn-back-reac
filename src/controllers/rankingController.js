// controllers/rankingController.js
import { Prueba } from "../models/Prueba.js"
import { Cuenta } from "../models/Cuenta.js"
import { Jugador } from "../models/Jugador.js"
import { Op } from "sequelize"

// Función auxiliar para calcular el rango de fechas
// Ahora acepta: desde/hasta (ISO strings) O periodo legacy
const calcularRangoFechas = (desde, hasta, periodo) => {
  const ahora = new Date()

  // Si se pasan fechas explícitas, tienen prioridad
  if (desde || hasta) {
    return {
      fechaInicio: desde ? new Date(desde) : new Date(0),
      fechaFin: hasta ? new Date(hasta) : ahora,
    }
  }

  // Compatibilidad con periodo legacy
  let fechaInicio
  switch (periodo) {
    case "semanal":
      fechaInicio = new Date(ahora)
      fechaInicio.setDate(ahora.getDate() - 7)
      break
    case "mensual":
      fechaInicio = new Date(ahora)
      fechaInicio.setMonth(ahora.getMonth() - 1)
      break
    default: // "general" o sin especificar
      fechaInicio = new Date(0)
  }

  return { fechaInicio, fechaFin: ahora }
}

// Obtener resultados personales
export const obtenerResultadosPersonales = async (req, res) => {
  try {
    const { cuentaId } = req.params
    // Nuevo: desde/hasta en query params (ISO date strings)
    // Ej: ?desde=2024-01-01&hasta=2024-12-31
    // Compatibilidad: ?periodo=semanal|mensual|general
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

    const totalPruebas = pruebas.length
    const totalIntentos = pruebas.reduce((sum, p) => sum + (p.cantidad_intentos || 0), 0)
    const totalAciertos = pruebas.reduce((sum, p) => sum + (p.cantidad_aciertos || 0), 0)
    const totalErrores = pruebas.reduce((sum, p) => sum + (p.cantidad_errores || 0), 0)

    const tiposPrueba = ["manual", "secuencial", "aleatorio"]
    const estadisticasPorTipo = {}

    tiposPrueba.forEach((tipo) => {
      // Filtrar por tipo. El array ya viene ordenado DESC por fecha.
      const pruebasTipo = pruebas.filter((p) => p.tipo === tipo)

      const aciertos = pruebasTipo.reduce((sum, p) => sum + (p.cantidad_aciertos || 0), 0)
      const errores  = pruebasTipo.reduce((sum, p) => sum + (p.cantidad_errores  || 0), 0)

      const getRatio = (p) => {
        const intentos = p.cantidad_intentos || (p.cantidad_aciertos || 0) + (p.cantidad_errores || 0)
        return intentos > 0 ? (p.cantidad_aciertos || 0) / intentos : 0
      }

      // Última sesión: primera del array (ya ordenado DESC por fecha)
      const ultimaSesion = pruebasTipo.length > 0 ? pruebasTipo[0] : null

      // Mejor prueba: mayor ratio de aciertos
      const mejorPrueba = pruebasTipo.length > 0
        ? pruebasTipo.reduce((best, cur) => getRatio(cur) > getRatio(best) ? cur : best)
        : null

      // Peor prueba: menor ratio de aciertos (debe ser distinta a la mejor si hay más de 1)
      const peorPrueba = pruebasTipo.length > 0
        ? pruebasTipo.reduce((worst, cur) => getRatio(cur) < getRatio(worst) ? cur : worst)
        : null

      const fmt = (p) => p ? {
        id:       p.id,
        fecha:    p.fecha,
        aciertos: p.cantidad_aciertos || 0,
        errores:  p.cantidad_errores  || 0,
        intentos: p.cantidad_intentos || (p.cantidad_aciertos || 0) + (p.cantidad_errores || 0),
      } : null

      estadisticasPorTipo[tipo] = {
        total_realizadas: pruebasTipo.length,
        total_aciertos:   aciertos,
        total_errores:    errores,
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
          total_pruebas: totalPruebas,
          total_intentos: totalIntentos,
          total_aciertos: totalAciertos,
          total_errores: totalErrores,
        },
        por_tipo_prueba: estadisticasPorTipo,
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

// Obtener ranking general (top 5)
export const obtenerRankingGeneral = async (req, res) => {
  try {
    const { desde, hasta, periodo = "general", posicion, carrera } = req.query
    const { fechaInicio, fechaFin } = calcularRangoFechas(desde, hasta, periodo)

    const filtrosJugador = {}
    if (posicion) filtrosJugador.posicion_principal = posicion
    if (carrera) filtrosJugador.carrera = carrera

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

    const jugadoresConEstadisticas = cuentas.map((cuenta) => {
      const pruebas = cuenta.pruebas || []
      const totalAciertos = pruebas.reduce((sum, p) => sum + (p.cantidad_aciertos || 0), 0)
      const totalErrores = pruebas.reduce((sum, p) => sum + (p.cantidad_errores || 0), 0)
      const totalIntentos = pruebas.reduce((sum, p) => sum + (p.cantidad_intentos || 0), 0)

      return {
        cuentaId: cuenta.id,
        jugador: {
          id: cuenta.jugador.id,
          nombres: cuenta.jugador.nombres,
          apellidos: cuenta.jugador.apellidos,
          carrera: cuenta.jugador.carrera,
          posicion_principal: cuenta.jugador.posicion_principal,
        },
        totales_generales: {
          total_pruebas: pruebas.length,
          total_intentos: totalIntentos,
          total_aciertos: totalAciertos,
          total_errores: totalErrores,
        },
      }
    })

    const top5 = jugadoresConEstadisticas
      .sort((a, b) => b.totales_generales.total_aciertos - a.totales_generales.total_aciertos)
      .slice(0, 5)

    res.json({
      success: true,
      data: {
        rango: { desde: fechaInicio, hasta: fechaFin },
        filtros: { posicion: posicion || "todas", carrera: carrera || "todas" },
        top_5: top5,
      },
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, message: "Error al obtener ranking general", error: error.message })
  }
}

// Obtener posición del usuario en el ranking general
export const obtenerPosicionUsuario = async (req, res) => {
  try {
    const { cuentaId } = req.params
    const { desde, hasta, periodo = "general", posicion, carrera } = req.query
    const { fechaInicio, fechaFin } = calcularRangoFechas(desde, hasta, periodo)

    const filtrosJugador = {}
    if (posicion) filtrosJugador.posicion_principal = posicion
    if (carrera) filtrosJugador.carrera = carrera

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

    const jugadoresConEstadisticas = cuentas.map((cuenta) => {
      const pruebas = cuenta.pruebas || []
      return {
        cuentaId: cuenta.id,
        jugador: {
          id: cuenta.jugador.id,
          nombres: cuenta.jugador.nombres,
          apellidos: cuenta.jugador.apellidos,
          carrera: cuenta.jugador.carrera,
          posicion_principal: cuenta.jugador.posicion_principal,
        },
        totales_generales: {
          total_pruebas: pruebas.length,
          total_intentos: pruebas.reduce((sum, p) => sum + (p.cantidad_intentos || 0), 0),
          total_aciertos: pruebas.reduce((sum, p) => sum + (p.cantidad_aciertos || 0), 0),
          total_errores: pruebas.reduce((sum, p) => sum + (p.cantidad_errores || 0), 0),
        },
      }
    })

    const rankingCompleto = jugadoresConEstadisticas.sort(
      (a, b) => b.totales_generales.total_aciertos - a.totales_generales.total_aciertos
    )

    const posicionUsuario = rankingCompleto.findIndex((j) => j.cuentaId === Number.parseInt(cuentaId))

    if (posicionUsuario === -1) {
      return res.status(404).json({ success: false, message: "Usuario no encontrado en el ranking" })
    }

    res.json({
      success: true,
      data: {
        rango: { desde: fechaInicio, hasta: fechaFin },
        filtros: { posicion: posicion || "todas", carrera: carrera || "todas" },
        posicion_ranking: posicionUsuario + 1,
        total_jugadores: rankingCompleto.length,
        usuario: rankingCompleto[posicionUsuario],
      },
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, message: "Error al obtener posición del usuario", error: error.message })
  }
}