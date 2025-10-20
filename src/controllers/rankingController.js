// Import necessary models and operators
import { Op } from "sequelize"
import { Prueba } from "../models/Prueba.js"
import { Cuenta } from "../models/Cuenta.js"
import { Jugador } from "../models/Jugador.js"
import { Entrenador } from "../models/Entrenador.js"
import { Tecnico } from "../models/Tecnico.js"

// 📌 Función auxiliar para calcular rango de fechas según periodo
const calcularRangoFechas = (periodo) => {
  const fechaFin = new Date()
  const fechaInicio = new Date()

  switch (periodo) {
    case "semanal":
      fechaInicio.setDate(fechaInicio.getDate() - 7)
      break
    case "mensual":
      fechaInicio.setDate(fechaInicio.getDate() - 30)
      break
    case "general":
      return null // No date filter for general
    default:
      return null
  }

  fechaInicio.setHours(0, 0, 0, 0)
  fechaFin.setHours(23, 59, 59, 999)

  console.log(`[v0] Periodo: ${periodo}, Fecha Inicio: ${fechaInicio}, Fecha Fin: ${fechaFin}`)

  return { fechaInicio, fechaFin }
}

// 📌 Función auxiliar para encontrar la mejor prueba por tipo
const encontrarMejorPruebaPorTipo = (pruebas, tipo) => {
  const pruebasTipo = pruebas.filter((p) => p.tipo === tipo)

  if (pruebasTipo.length === 0) return null

  // Find the test with highest accuracy percentage
  let mejorPrueba = null
  let mejorPorcentaje = -1

  pruebasTipo.forEach((p) => {
    const aciertos = p.cantidad_aciertos || 0
    const errores = p.cantidad_errores || 0
    const intentos = p.cantidad_intentos || aciertos + errores
    const porcentaje = intentos > 0 ? (aciertos / intentos) * 100 : 0

    if (porcentaje > mejorPorcentaje) {
      mejorPorcentaje = porcentaje
      mejorPrueba = p
    }
  })

  if (!mejorPrueba) return null

  const aciertos = mejorPrueba.cantidad_aciertos || 0
  const errores = mejorPrueba.cantidad_errores || 0
  const intentos = mejorPrueba.cantidad_intentos || aciertos + errores

  return {
    id: mejorPrueba.id,
    fecha: mejorPrueba.fecha,
    aciertos,
    errores,
    intentos,
    porcentajeAcierto: mejorPorcentaje.toFixed(2),
    ejercicios_realizados: mejorPrueba.ejercicios_realizados || 0,
  }
}

// 📌 Ranking personal resumido (GET) por cuentaId
export const rankingPersonal = async (req, res) => {
  try {
    const { cuentaId } = req.params
    const { fechaInicio, fechaFin } = req.query // opcional: filtros de fecha

    if (!cuentaId) {
      return res.status(400).json({ success: false, message: "El campo cuentaId es requerido" })
    }

    // Filtro por fechas
    const filtros = { cuentaId, estado: "finalizada" }
    if (fechaInicio && fechaFin) {
      filtros.fecha = { [Op.between]: [new Date(fechaInicio), new Date(fechaFin)] }
    }

    const pruebas = await Prueba.findAll({
      where: filtros,
      include: [
        {
          model: Cuenta,
          as: "cuenta",
          attributes: ["id", "usuario", "rol", "activo"], // Exclude token and password
          include: [
            {
              model: Jugador,
              as: "jugador",
              attributes: { exclude: ["imagen"] }, // Exclude player image
            },
            {
              model: Entrenador,
              as: "entrenador",
              attributes: { exclude: ["imagen"] }, // Exclude coach image
            },
            {
              model: Tecnico,
              as: "tecnico",
              attributes: { exclude: ["imagen"] }, // Exclude technician image
            },
          ],
        },
      ],
    })

    if (pruebas.length === 0) {
      return res.json({ success: true, data: null })
    }

    // Inicializar acumuladores por tipo
    const tipos = ["secuencial", "aleatorio", "manual"]
    const resumenPorTipo = {}
    tipos.forEach((tipo) => {
      resumenPorTipo[tipo] = {
        totalAciertos: 0,
        totalErrores: 0,
        totalIntentos: 0,
        porcentajePromedio: "0.00",
        cantidadPruebas: 0,
        mejorPrueba: null, // Add best test tracking
      }
    })

    let totalAciertos = 0,
      totalErrores = 0,
      totalIntentos = 0

    // Acumular datos
    pruebas.forEach((p) => {
      const tipo = p.tipo
      const aciertos = p.cantidad_aciertos || 0
      const errores = p.cantidad_errores || 0
      const intentos = p.cantidad_intentos || aciertos + errores

      // Totales generales
      totalAciertos += aciertos
      totalErrores += errores
      totalIntentos += intentos

      // Totales por tipo
      if (resumenPorTipo[tipo]) {
        resumenPorTipo[tipo].totalAciertos += aciertos
        resumenPorTipo[tipo].totalErrores += errores
        resumenPorTipo[tipo].totalIntentos += intentos
        resumenPorTipo[tipo].cantidadPruebas += 1

        const porcentajeActual = intentos > 0 ? (aciertos / intentos) * 100 : 0
        const mejorActual = resumenPorTipo[tipo].mejorPrueba

        if (!mejorActual || porcentajeActual > mejorActual.porcentaje) {
          resumenPorTipo[tipo].mejorPrueba = {
            id: p.id,
            aciertos,
            errores,
            intentos,
            porcentaje: porcentajeActual.toFixed(2),
            fecha: p.fecha,
            tiempo_inicio: p.tiempo_inicio,
            tiempo_fin: p.tiempo_fin,
          }
        }
      }
    })

    // Calcular porcentaje promedio por tipo
    tipos.forEach((tipo) => {
      const r = resumenPorTipo[tipo]
      r.porcentajePromedio = r.totalIntentos > 0 ? ((r.totalAciertos / r.totalIntentos) * 100).toFixed(2) : "0.00"
    })

    const cuenta = pruebas[0].cuenta

    res.json({
      success: true,
      data: {
        cuentaId: cuenta.id,
        jugador: cuenta.jugador || null,
        entrenador: cuenta.entrenador || null,
        tecnico: cuenta.tecnico || null,
        totalAciertos,
        totalErrores,
        totalIntentos,
        porcentajePromedio: totalIntentos > 0 ? ((totalAciertos / totalIntentos) * 100).toFixed(2) : "0.00",
        resumenPorTipo,
      },
    })
  } catch (error) {
    res.status(500).json({ success: false, message: "Error en rankingPersonal", error: error.message })
  }
}


// ------------------ Ranking General Filtrado ------------------
export const rankingGeneralFiltrado = async (req, res) => {
  try {
    const { fechaInicio, fechaFin, tipo, top } = req.body

    const filtros = { estado: "finalizada" }

    if (fechaInicio && fechaFin) {
      filtros.fecha = { [Op.between]: [new Date(fechaInicio), new Date(fechaFin)] }
    } else {
      const defFin = new Date()
      const defInicio = new Date()
      defInicio.setMonth(defInicio.getMonth() - 1)
      filtros.fecha = { [Op.between]: [defInicio, defFin] }
    }

    if (tipo) filtros.tipo = tipo

    const pruebas = await Prueba.findAll({
      where: filtros,
      attributes: { exclude: ["imagen"] }, // Exclude image
      include: [
        {
          model: Cuenta,
          as: "cuenta",
          attributes: ["id", "nombre", "rol"],
          include: [
            {
              model: Jugador,
              as: "jugador",
              attributes: { exclude: ["imagen"] },
            },
            {
              model: Entrenador,
              as: "entrenador",
              attributes: { exclude: ["imagen"] },
            },
            {
              model: Tecnico,
              as: "tecnico",
              attributes: { exclude: ["imagen"] },
            },
          ],
        },
      ],
    })

    let resultados = pruebas
      .map((prueba) => {
        const intentos = prueba.cantidad_intentos || 0
        const aciertos = prueba.cantidad_aciertos || 0
        const errores = prueba.cantidad_errores || 0

        const porcentajeAcierto = intentos > 0 ? (aciertos / intentos) * 100 : 0

        return {
          id: prueba.id,
          tipo: prueba.tipo,
          cuentaId: prueba.cuentaId,
          aciertos,
          errores,
          intentos,
          porcentajeAcierto: porcentajeAcierto.toFixed(2),
          ejercicios_realizados: prueba.ejercicios_realizados || 0,
          fecha: prueba.fecha,
          cuenta: {
            id: prueba.cuenta.id,
            nombre: prueba.cuenta.nombre,
            jugador: prueba.cuenta.jugador || null,
            entrenador: prueba.cuenta.entrenador || null,
            tecnico: prueba.cuenta.tecnico || null,
          },
        }
      })
      .sort((a, b) => b.porcentajeAcierto - a.porcentajeAcierto)

    if (top) resultados = resultados.slice(0, top)

    res.json({ success: true, data: resultados })
  } catch (error) {
    res.status(500).json({ success: false, message: "Error en rankingGeneralFiltrado", error: error.message })
  }
}
