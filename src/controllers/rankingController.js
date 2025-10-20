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
        mejorPrueba: null,
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

// ------------------ Ranking General (Top 10) ------------------
export const rankingGeneral = async (req, res) => {
  try {
    const { periodo = "general", carrera, posicion } = req.query

    const rangoFechas = calcularRangoFechas(periodo)

    // Filtro base
    const filtros = { estado: "finalizada" }

    if (rangoFechas) {
      filtros.fecha = { [Op.between]: [rangoFechas.fechaInicio, rangoFechas.fechaFin] }
    }

    const jugadorInclude = {
      model: Jugador,
      as: "jugador",
      attributes: { exclude: ["imagen"] }, // Exclude player image
    }

    const jugadorWhere = {}
    if (carrera && carrera !== "general") {
      jugadorWhere.carrera = carrera
    }
    if (posicion && posicion !== "general") {
      jugadorWhere.posicion_principal = posicion
    }

    if (Object.keys(jugadorWhere).length > 0) {
      jugadorInclude.where = jugadorWhere
      jugadorInclude.required = true // Only include players that match the filter
    }

    const pruebas = await Prueba.findAll({
      where: filtros,
      attributes: { exclude: ["imagen"] },
      include: [
        {
          model: Cuenta,
          as: "cuenta",
          attributes: ["id", "usuario", "rol"],
          include: [
            jugadorInclude,
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

    if (pruebas.length === 0) {
      return res.json({ success: true, data: [] })
    }

    const jugadoresMap = {}

    pruebas.forEach((p) => {
      const cuentaId = p.cuentaId

      if (!jugadoresMap[cuentaId]) {
        jugadoresMap[cuentaId] = {
          cuenta: p.cuenta,
          totalAciertos: 0,
          totalErrores: 0,
          totalIntentos: 0,
          cantidadPruebas: 0,
          resumenPorTipo: {
            secuencial: { totalAciertos: 0, totalErrores: 0, totalIntentos: 0, cantidadPruebas: 0 },
            aleatorio: { totalAciertos: 0, totalErrores: 0, totalIntentos: 0, cantidadPruebas: 0 },
            manual: { totalAciertos: 0, totalErrores: 0, totalIntentos: 0, cantidadPruebas: 0 },
          },
        }
      }

      const aciertos = p.cantidad_aciertos || 0
      const errores = p.cantidad_errores || 0
      const intentos = p.cantidad_intentos || aciertos + errores

      jugadoresMap[cuentaId].totalAciertos += aciertos
      jugadoresMap[cuentaId].totalErrores += errores
      jugadoresMap[cuentaId].totalIntentos += intentos
      jugadoresMap[cuentaId].cantidadPruebas += 1

      // Accumulate by type
      const tipo = p.tipo
      if (jugadoresMap[cuentaId].resumenPorTipo[tipo]) {
        jugadoresMap[cuentaId].resumenPorTipo[tipo].totalAciertos += aciertos
        jugadoresMap[cuentaId].resumenPorTipo[tipo].totalErrores += errores
        jugadoresMap[cuentaId].resumenPorTipo[tipo].totalIntentos += intentos
        jugadoresMap[cuentaId].resumenPorTipo[tipo].cantidadPruebas += 1
      }
    })

    const jugadoresArray = Object.values(jugadoresMap).map((j) => {
      const porcentajePromedio = j.totalIntentos > 0 ? ((j.totalAciertos / j.totalIntentos) * 100).toFixed(2) : "0.00"

      // Calculate percentage by type
      const tipos = ["secuencial", "aleatorio", "manual"]
      tipos.forEach((tipo) => {
        const r = j.resumenPorTipo[tipo]
        r.porcentajePromedio = r.totalIntentos > 0 ? ((r.totalAciertos / r.totalIntentos) * 100).toFixed(2) : "0.00"
      })

      return {
        cuentaId: j.cuenta.id,
        jugador: j.cuenta.jugador || null,
        entrenador: j.cuenta.entrenador || null,
        tecnico: j.cuenta.tecnico || null,
        totalAciertos: j.totalAciertos,
        totalErrores: j.totalErrores,
        totalIntentos: j.totalIntentos,
        porcentajePromedio,
        cantidadPruebas: j.cantidadPruebas,
        resumenPorTipo: j.resumenPorTipo,
      }
    })

    const ranking = jugadoresArray.sort(
      (a, b) => Number.parseFloat(b.porcentajePromedio) - Number.parseFloat(a.porcentajePromedio),
    )

    res.json({
      success: true,
      data: ranking,
      periodo,
      carrera: carrera || "general",
      posicion: posicion || "general",
    })
  } catch (error) {
    res.status(500).json({ success: false, message: "Error en rankingGeneral", error: error.message })
  }
}
