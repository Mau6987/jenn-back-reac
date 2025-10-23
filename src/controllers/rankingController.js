// controllers/rankingController.js
import { Prueba } from "../models/Prueba.js"
import { Cuenta } from "../models/Cuenta.js"
import { Jugador } from "../models/Jugador.js"
import { Op } from "sequelize"

// Función auxiliar para calcular el rango de fechas según el periodo
const calcularRangoFechas = (periodo) => {
  const ahora = new Date()
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
    case "general":
      fechaInicio = new Date(0) // Desde el inicio de los tiempos
      break
    default:
      fechaInicio = new Date(0)
  }

  return { fechaInicio, fechaFin: ahora }
}

// Obtener resultados personales
export const obtenerResultadosPersonales = async (req, res) => {
  try {
    const { cuentaId } = req.params
    const { periodo = "general" } = req.query

    const { fechaInicio, fechaFin } = calcularRangoFechas(periodo)

    // Obtener todas las pruebas finalizadas del usuario en el periodo
    const pruebas = await Prueba.findAll({
      where: {
        cuentaId,
        estado: "finalizada",
        fecha: {
          [Op.between]: [fechaInicio, fechaFin],
        },
      },
    })

    // Calcular totales generales
    const totalPruebas = pruebas.length
    const totalIntentos = pruebas.reduce((sum, p) => sum + (p.cantidad_intentos || 0), 0)
    const totalAciertos = pruebas.reduce((sum, p) => sum + (p.cantidad_aciertos || 0), 0)
    const totalErrores = pruebas.reduce((sum, p) => sum + (p.cantidad_errores || 0), 0)

    // Calcular estadísticas por tipo de prueba
    const estadisticasPorTipo = {}
    const tiposPrueba = ["manual", "secuencial", "aleatorio"]

    tiposPrueba.forEach((tipo) => {
      const pruebasTipo = pruebas.filter((p) => p.tipo === tipo)
      const totalRealizadas = pruebasTipo.length
      const aciertos = pruebasTipo.reduce((sum, p) => sum + (p.cantidad_aciertos || 0), 0)
      const errores = pruebasTipo.reduce((sum, p) => sum + (p.cantidad_errores || 0), 0)

      // Encontrar la mejor prueba de este tipo (mayor cantidad de aciertos)
      const mejorPrueba = pruebasTipo.reduce((mejor, actual) => {
        if (!mejor) return actual
        return (actual.cantidad_aciertos || 0) > (mejor.cantidad_aciertos || 0) ? actual : mejor
      }, null)

      estadisticasPorTipo[tipo] = {
        total_realizadas: totalRealizadas,
        total_aciertos: aciertos,
        total_errores: errores,
        mejor_prueba: mejorPrueba
          ? {
              id: mejorPrueba.id,
              fecha: mejorPrueba.fecha,
              aciertos: mejorPrueba.cantidad_aciertos,
              errores: mejorPrueba.cantidad_errores,
              intentos: mejorPrueba.cantidad_intentos,
            }
          : null,
      }
    })

    // Encontrar la mejor prueba en general (mayor cantidad de aciertos)
    const mejorPruebaGeneral = pruebas.reduce((mejor, actual) => {
      if (!mejor) return actual
      return (actual.cantidad_aciertos || 0) > (mejor.cantidad_aciertos || 0) ? actual : mejor
    }, null)

    res.json({
      success: true,
      data: {
        periodo,
        totales_generales: {
          total_pruebas: totalPruebas,
          total_intentos: totalIntentos,
          total_aciertos: totalAciertos,
          total_errores: totalErrores,
        },
        por_tipo_prueba: estadisticasPorTipo,
        mejor_prueba_general: mejorPruebaGeneral
          ? {
              id: mejorPruebaGeneral.id,
              tipo: mejorPruebaGeneral.tipo,
              fecha: mejorPruebaGeneral.fecha,
              aciertos: mejorPruebaGeneral.cantidad_aciertos,
              errores: mejorPruebaGeneral.cantidad_errores,
              intentos: mejorPruebaGeneral.cantidad_intentos,
            }
          : null,
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
    const { periodo = "general", posicion, carrera } = req.query

    const { fechaInicio, fechaFin } = calcularRangoFechas(periodo)

    // Construir filtros para jugadores
    const filtrosJugador = {}
    if (posicion) filtrosJugador.posicion_principal = posicion
    if (carrera) filtrosJugador.carrera = carrera

    // Obtener todas las cuentas de jugadores con sus pruebas
    const cuentas = await Cuenta.findAll({
      where: { rol: "jugador", activo: true },
      include: [
        {
          model: Jugador,
          as: "jugador",
          where: filtrosJugador,
          required: true,
        },
        {
          model: Prueba,
          as: "pruebas",
          where: {
            estado: "finalizada",
            fecha: {
              [Op.between]: [fechaInicio, fechaFin],
            },
          },
          required: false,
        },
      ],
    })

    // Calcular estadísticas para cada jugador
    const jugadoresConEstadisticas = cuentas.map((cuenta) => {
      const pruebas = cuenta.pruebas || []

      const totalPruebas = pruebas.length
      const totalIntentos = pruebas.reduce((sum, p) => sum + (p.cantidad_intentos || 0), 0)
      const totalAciertos = pruebas.reduce((sum, p) => sum + (p.cantidad_aciertos || 0), 0)
      const totalErrores = pruebas.reduce((sum, p) => sum + (p.cantidad_errores || 0), 0)

      // Estadísticas por tipo
      const estadisticasPorTipo = {}
      const tiposPrueba = ["manual", "secuencial", "aleatorio"]

      tiposPrueba.forEach((tipo) => {
        const pruebasTipo = pruebas.filter((p) => p.tipo === tipo)
        const totalRealizadas = pruebasTipo.length
        const aciertos = pruebasTipo.reduce((sum, p) => sum + (p.cantidad_aciertos || 0), 0)
        const errores = pruebasTipo.reduce((sum, p) => sum + (p.cantidad_errores || 0), 0)

        const mejorPrueba = pruebasTipo.reduce((mejor, actual) => {
          if (!mejor) return actual
          return (actual.cantidad_aciertos || 0) > (mejor.cantidad_aciertos || 0) ? actual : mejor
        }, null)

        estadisticasPorTipo[tipo] = {
          total_realizadas: totalRealizadas,
          total_aciertos: aciertos,
          total_errores: errores,
          mejor_prueba: mejorPrueba
            ? {
                id: mejorPrueba.id,
                fecha: mejorPrueba.fecha,
                aciertos: mejorPrueba.cantidad_aciertos,
                errores: mejorPrueba.cantidad_errores,
                intentos: mejorPrueba.cantidad_intentos,
              }
            : null,
        }
      })

      const mejorPruebaGeneral = pruebas.reduce((mejor, actual) => {
        if (!mejor) return actual
        return (actual.cantidad_aciertos || 0) > (mejor.cantidad_aciertos || 0) ? actual : mejor
      }, null)

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
          total_pruebas: totalPruebas,
          total_intentos: totalIntentos,
          total_aciertos: totalAciertos,
          total_errores: totalErrores,
        },
        por_tipo_prueba: estadisticasPorTipo,
        mejor_prueba_general: mejorPruebaGeneral
          ? {
              id: mejorPruebaGeneral.id,
              tipo: mejorPruebaGeneral.tipo,
              fecha: mejorPruebaGeneral.fecha,
              aciertos: mejorPruebaGeneral.cantidad_aciertos,
              errores: mejorPruebaGeneral.cantidad_errores,
              intentos: mejorPruebaGeneral.cantidad_intentos,
            }
          : null,
      }
    })

    // Ordenar por total de aciertos (descendente) y tomar los top 5
    const top5 = jugadoresConEstadisticas
      .sort((a, b) => b.totales_generales.total_aciertos - a.totales_generales.total_aciertos)
      .slice(0, 5)

    res.json({
      success: true,
      data: {
        periodo,
        filtros: {
          posicion: posicion || "todas",
          carrera: carrera || "todas",
        },
        top_5: top5,
      },
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({
      success: false,
      message: "Error al obtener ranking general",
      error: error.message,
    })
  }
}

// Obtener posición del usuario en el ranking general
export const obtenerPosicionUsuario = async (req, res) => {
  try {
    const { cuentaId } = req.params
    const { periodo = "general", posicion, carrera } = req.query

    const { fechaInicio, fechaFin } = calcularRangoFechas(periodo)

    // Construir filtros para jugadores
    const filtrosJugador = {}
    if (posicion) filtrosJugador.posicion_principal = posicion
    if (carrera) filtrosJugador.carrera = carrera

    // Obtener todas las cuentas de jugadores con sus pruebas
    const cuentas = await Cuenta.findAll({
      where: { rol: "jugador", activo: true },
      include: [
        {
          model: Jugador,
          as: "jugador",
          where: filtrosJugador,
          required: true,
        },
        {
          model: Prueba,
          as: "pruebas",
          where: {
            estado: "finalizada",
            fecha: {
              [Op.between]: [fechaInicio, fechaFin],
            },
          },
          required: false,
        },
      ],
    })

    // Calcular estadísticas para cada jugador
    const jugadoresConEstadisticas = cuentas.map((cuenta) => {
      const pruebas = cuenta.pruebas || []

      const totalPruebas = pruebas.length
      const totalIntentos = pruebas.reduce((sum, p) => sum + (p.cantidad_intentos || 0), 0)
      const totalAciertos = pruebas.reduce((sum, p) => sum + (p.cantidad_aciertos || 0), 0)
      const totalErrores = pruebas.reduce((sum, p) => sum + (p.cantidad_errores || 0), 0)

      // Estadísticas por tipo
      const estadisticasPorTipo = {}
      const tiposPrueba = ["manual", "secuencial", "aleatorio"]

      tiposPrueba.forEach((tipo) => {
        const pruebasTipo = pruebas.filter((p) => p.tipo === tipo)
        const totalRealizadas = pruebasTipo.length
        const aciertos = pruebasTipo.reduce((sum, p) => sum + (p.cantidad_aciertos || 0), 0)
        const errores = pruebasTipo.reduce((sum, p) => sum + (p.cantidad_errores || 0), 0)

        const mejorPrueba = pruebasTipo.reduce((mejor, actual) => {
          if (!mejor) return actual
          return (actual.cantidad_aciertos || 0) > (mejor.cantidad_aciertos || 0) ? actual : mejor
        }, null)

        estadisticasPorTipo[tipo] = {
          total_realizadas: totalRealizadas,
          total_aciertos: aciertos,
          total_errores: errores,
          mejor_prueba: mejorPrueba
            ? {
                id: mejorPrueba.id,
                fecha: mejorPrueba.fecha,
                aciertos: mejorPrueba.cantidad_aciertos,
                errores: mejorPrueba.cantidad_errores,
                intentos: mejorPrueba.cantidad_intentos,
              }
            : null,
        }
      })

      const mejorPruebaGeneral = pruebas.reduce((mejor, actual) => {
        if (!mejor) return actual
        return (actual.cantidad_aciertos || 0) > (mejor.cantidad_aciertos || 0) ? actual : mejor
      }, null)

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
          total_pruebas: totalPruebas,
          total_intentos: totalIntentos,
          total_aciertos: totalAciertos,
          total_errores: totalErrores,
        },
        por_tipo_prueba: estadisticasPorTipo,
        mejor_prueba_general: mejorPruebaGeneral
          ? {
              id: mejorPruebaGeneral.id,
              tipo: mejorPruebaGeneral.tipo,
              fecha: mejorPruebaGeneral.fecha,
              aciertos: mejorPruebaGeneral.cantidad_aciertos,
              errores: mejorPruebaGeneral.cantidad_errores,
              intentos: mejorPruebaGeneral.cantidad_intentos,
            }
          : null,
      }
    })

    // Ordenar por total de aciertos (descendente)
    const rankingCompleto = jugadoresConEstadisticas.sort(
      (a, b) => b.totales_generales.total_aciertos - a.totales_generales.total_aciertos,
    )

    // Encontrar la posición del usuario
    const posicionUsuario = rankingCompleto.findIndex((j) => j.cuentaId === Number.parseInt(cuentaId))

    if (posicionUsuario === -1) {
      return res.status(404).json({
        success: false,
        message: "Usuario no encontrado en el ranking",
      })
    }

    const datosUsuario = rankingCompleto[posicionUsuario]

    res.json({
      success: true,
      data: {
        periodo,
        filtros: {
          posicion: posicion || "todas",
          carrera: carrera || "todas",
        },
        posicion_ranking: posicionUsuario + 1, // +1 porque el índice empieza en 0
        total_jugadores: rankingCompleto.length,
        usuario: datosUsuario,
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
