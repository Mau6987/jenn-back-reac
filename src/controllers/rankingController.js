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

    console.log("[v0] rankingPersonal called with:", { cuentaId, fechaInicio, fechaFin })

    if (!cuentaId) {
      return res.status(400).json({ success: false, message: "El campo cuentaId es requerido" })
    }

    const filtros = { cuentaId, estado: "finalizada" }

    if (fechaInicio && fechaFin) {
      const inicio = new Date(fechaInicio)
      inicio.setHours(0, 0, 0, 0)

      const fin = new Date(fechaFin)
      fin.setHours(23, 59, 59, 999)

      filtros.fecha = { [Op.between]: [inicio, fin] }
      console.log("[v0] Filtering by dates:", { inicio, fin })
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

    console.log("[v0] Found pruebas:", pruebas.length)
    pruebas.forEach((p, index) => {
      console.log(`[v0] Prueba ${index + 1}:`, {
        id: p.id,
        tipo: p.tipo,
        cantidad_intentos: p.cantidad_intentos,
        cantidad_aciertos: p.cantidad_aciertos,
        cantidad_errores: p.cantidad_errores,
        fecha: p.fecha,
      })
    })

    if (pruebas.length === 0) {
      return res.json({
        success: true,
        data: {
          cuentaId,
          jugador: null,
          entrenador: null,
          tecnico: null,
          totalAciertos: 0,
          totalErrores: 0,
          totalIntentos: 0,
          porcentajePromedio: "0.00",
          resumenPorTipo: {
            secuencial: {
              totalAciertos: 0,
              totalErrores: 0,
              totalIntentos: 0,
              porcentajePromedio: "0.00",
              cantidadPruebas: 0,
              mejorPrueba: null,
            },
            aleatorio: {
              totalAciertos: 0,
              totalErrores: 0,
              totalIntentos: 0,
              porcentajePromedio: "0.00",
              cantidadPruebas: 0,
              mejorPrueba: null,
            },
            manual: {
              totalAciertos: 0,
              totalErrores: 0,
              totalIntentos: 0,
              porcentajePromedio: "0.00",
              cantidadPruebas: 0,
              mejorPrueba: null,
            },
          },
        },
      })
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

      console.log(`[v0] Processing prueba tipo ${tipo}:`, { aciertos, errores, intentos })

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

        if (!mejorActual || porcentajeActual > Number.parseFloat(mejorActual.porcentaje)) {
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
          console.log(`[v0] Updated best test for ${tipo}:`, resumenPorTipo[tipo].mejorPrueba)
        }
      }
    })

    // Calcular porcentaje promedio por tipo
    tipos.forEach((tipo) => {
      const r = resumenPorTipo[tipo]
      r.porcentajePromedio = r.totalIntentos > 0 ? ((r.totalAciertos / r.totalIntentos) * 100).toFixed(2) : "0.00"
      console.log(`[v0] Final summary for ${tipo}:`, {
        totalAciertos: r.totalAciertos,
        totalErrores: r.totalErrores,
        totalIntentos: r.totalIntentos,
        porcentajePromedio: r.porcentajePromedio,
        cantidadPruebas: r.cantidadPruebas,
        mejorPrueba: r.mejorPrueba,
      })
    })

    const cuenta = pruebas[0].cuenta

    const response = {
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
    }

    console.log("[v0] Final response:", JSON.stringify(response, null, 2))

    res.json(response)
  } catch (error) {
    console.error("[v0] Error in rankingPersonal:", error)
    res.status(500).json({ success: false, message: "Error en rankingPersonal", error: error.message })
  }
}

// ------------------ Ranking General (Top 10) ------------------
export const rankingGeneral = async (req, res) => {
  try {
    const { periodo = "general", carrera, posicion } = req.query

    console.log("[v0] rankingGeneral called with:", { periodo, carrera, posicion })

    const rangoFechas = calcularRangoFechas(periodo)

    // Filtro base
    const filtros = { estado: "finalizada" }

    if (rangoFechas) {
      filtros.fecha = { [Op.between]: [rangoFechas.fechaInicio, rangoFechas.fechaFin] }
    }

    const jugadorInclude = {
      model: Jugador,
      as: "jugador",
      attributes: { exclude: ["imagen"] },
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
      jugadorInclude.required = true
    }

    const pruebas = await Prueba.findAll({
      where: filtros,
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

    console.log("[v0] Found pruebas:", pruebas.length)

    if (pruebas.length === 0) {
      return res.json({
        success: true,
        data: [],
        periodo,
        carrera: carrera || "general",
        posicion: posicion || "general",
      })
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
        }
      }

      const aciertos = p.cantidad_aciertos || 0
      const errores = p.cantidad_errores || 0
      const intentos = p.cantidad_intentos || aciertos + errores

      jugadoresMap[cuentaId].totalAciertos += aciertos
      jugadoresMap[cuentaId].totalErrores += errores
      jugadoresMap[cuentaId].totalIntentos += intentos
      jugadoresMap[cuentaId].cantidadPruebas += 1
    })

    const jugadoresArray = Object.values(jugadoresMap).map((j) => {
      const porcentajePromedio = j.totalIntentos > 0 ? ((j.totalAciertos / j.totalIntentos) * 100).toFixed(2) : "0.00"

      return {
        cuentaId: j.cuenta.id,
        nombre:
          `${j.cuenta.jugador?.nombres || j.cuenta.entrenador?.nombres || j.cuenta.tecnico?.nombres || ""} ${j.cuenta.jugador?.apellidos || j.cuenta.entrenador?.apellidos || j.cuenta.tecnico?.apellidos || ""}`.trim(),
        jugador: j.cuenta.jugador || null,
        entrenador: j.cuenta.entrenador || null,
        tecnico: j.cuenta.tecnico || null,
        totalAciertos: j.totalAciertos,
        totalErrores: j.totalErrores,
        totalIntentos: j.totalIntentos,
        porcentajePromedio,
        cantidadPruebas: j.cantidadPruebas,
      }
    })

    const ranking = jugadoresArray
      .sort((a, b) => Number.parseFloat(b.porcentajePromedio) - Number.parseFloat(a.porcentajePromedio))
      .map((jugador, index) => ({
        ...jugador,
        posicion: index + 1,
      }))

    console.log("[v0] Ranking generated with", ranking.length, "players")

    res.json({
      success: true,
      data: ranking,
      periodo,
      carrera: carrera || "general",
      posicion: posicion || "general",
    })
  } catch (error) {
    console.error("[v0] Error in rankingGeneral:", error)
    res.status(500).json({ success: false, message: "Error en rankingGeneral", error: error.message })
  }
}

// ------------------ Ranking Personal Filtrado ------------------
export const rankingPersonalFiltrado = async (req, res) => {
  try {
    const { cuentaId, fechaInicio, fechaFin, tipos } = req.body

    if (!cuentaId) {
      return res.status(400).json({ success: false, message: "El campo cuentaId es requerido" })
    }

    const tiposFiltro =
      tipos && Array.isArray(tipos) && tipos.length > 0 ? tipos : ["secuencial", "aleatorio", "manual"]

    const filtros = {
      cuentaId,
      estado: "finalizada",
      tipo: { [Op.in]: tiposFiltro },
    }

    if (fechaInicio && fechaFin) {
      const inicio = new Date(fechaInicio)
      inicio.setHours(0, 0, 0, 0)

      const fin = new Date(fechaFin)
      fin.setHours(23, 59, 59, 999)

      filtros.fecha = { [Op.between]: [inicio, fin] }
    }

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

    if (pruebas.length === 0) {
      return res.json({ success: true, data: null })
    }

    const resumenPorTipo = {}
    tiposFiltro.forEach((tipo) => {
      const pruebasTipo = pruebas.filter((p) => p.tipo === tipo)
      if (pruebasTipo.length === 0) return

      let totalAciertos = 0
      let totalErrores = 0
      let totalIntentos = 0

      pruebasTipo.forEach((p) => {
        const aciertos = p.cantidad_aciertos || 0
        const errores = p.cantidad_errores || 0
        const intentos = p.cantidad_intentos || aciertos + errores

        totalAciertos += aciertos
        totalErrores += errores
        totalIntentos += intentos
      })

      resumenPorTipo[tipo] = {
        tipo,
        cuenta: pruebasTipo[0].cuenta,
        totalAciertos,
        totalErrores,
        totalIntentos,
        porcentajePromedio: totalIntentos > 0 ? ((totalAciertos / totalIntentos) * 100).toFixed(2) : "0.00",
        cantidadPruebas: pruebasTipo.length,
      }
    })

    res.json({ success: true, data: resumenPorTipo })
  } catch (error) {
    res.status(500).json({ success: false, message: "Error en rankingPersonalFiltrado", error: error.message })
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
