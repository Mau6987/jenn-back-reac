// controllers/rankingController.js
import { Op } from "sequelize"
import { Prueba } from "../models/Prueba.js"
import { Cuenta } from "../models/Cuenta.js"
import { Jugador } from "../models/Jugador.js"
import { Entrenador } from "../models/Entrenador.js"
import { Tecnico } from "../models/Tecnico.js"

// 📌 Función auxiliar para calcular estadísticas
const calcularEstadisticas = (pruebas) => {
  return pruebas
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
        tiempo_inicio: prueba.tiempo_inicio,
        tiempo_fin: prueba.tiempo_fin,
        fecha: prueba.fecha, // ✅ incluir fecha
        cuenta: prueba.cuenta
          ? {
              id: prueba.cuenta.id,
              nombre: prueba.cuenta.nombre,
              jugador: prueba.cuenta.jugador || null,
              entrenador: prueba.cuenta.entrenador || null,
              tecnico: prueba.cuenta.tecnico || null,
            }
          : null,
      }
    })
    .sort((a, b) => b.porcentajeAcierto - a.porcentajeAcierto) // ordenar desc
}

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
      fechaInicio.setDate(ahora.getDate() - 30)
      break
    case "general":
    default:
      return null // Sin filtro de fecha
  }

  fechaInicio.setHours(0, 0, 0, 0)
  const fechaFin = new Date(ahora)
  fechaFin.setHours(23, 59, 59, 999)

  return { fechaInicio, fechaFin }
}

const encontrarMejorPrueba = (pruebas) => {
  if (pruebas.length === 0) return null

  let mejorPrueba = null
  let mejorPorcentaje = -1

  pruebas.forEach((prueba) => {
    const intentos = prueba.cantidad_intentos || 0
    const aciertos = prueba.cantidad_aciertos || 0

    if (intentos > 0) {
      const porcentaje = (aciertos / intentos) * 100
      if (porcentaje > mejorPorcentaje) {
        mejorPorcentaje = porcentaje
        mejorPrueba = prueba
      }
    }
  })

  if (!mejorPrueba) return null

  const intentos = mejorPrueba.cantidad_intentos || 0
  const aciertos = mejorPrueba.cantidad_aciertos || 0
  const errores = mejorPrueba.cantidad_errores || 0

  return {
    id: mejorPrueba.id,
    tipo: mejorPrueba.tipo,
    aciertos,
    errores,
    intentos,
    porcentajeAcierto: ((aciertos / intentos) * 100).toFixed(2),
    fecha: mejorPrueba.fecha,
    tiempo_inicio: mejorPrueba.tiempo_inicio,
    tiempo_fin: mejorPrueba.tiempo_fin,
  }
}

// ------------------ Ranking Personal ------------------

// ------------------ Ranking Personal ------------------
export const rankingPersonal = async (req, res) => {
  try {
    const { cuentaId } = req.params
    const { periodo = "general" } = req.query // semanal, mensual, general

    if (!cuentaId) {
      return res.status(400).json({ success: false, message: "El campo cuentaId es requerido" })
    }

    const filtros = { cuentaId, estado: "finalizada" }
    const rangoFechas = calcularRangoFechas(periodo)

    if (rangoFechas) {
      filtros.fecha = { [Op.between]: [rangoFechas.fechaInicio, rangoFechas.fechaFin] }
    }

    const pruebas = await Prueba.findAll({
      where: filtros,
      include: [
        {
          model: Cuenta,
          as: "cuenta",
          include: [
            { model: Jugador, as: "jugador" },
            { model: Entrenador, as: "entrenador" },
            { model: Tecnico, as: "tecnico" },
          ],
        },
      ],
      order: [["fecha", "DESC"]],
    })

    if (pruebas.length === 0) {
      return res.json({
        success: true,
        data: {
          periodo,
          totalPruebas: 0,
          totalAciertos: 0,
          totalErrores: 0,
          totalIntentos: 0,
          porcentajeAcierto: "0.00",
          porcentajeError: "0.00",
          resumenPorTipo: {},
          mejorPrueba: null,
        },
      })
    }

    const tipos = ["secuencial", "aleatorio", "manual"]
    const resumenPorTipo = {}
    tipos.forEach((tipo) => {
      resumenPorTipo[tipo] = {
        totalAciertos: 0,
        totalErrores: 0,
        totalIntentos: 0,
        porcentajeAcierto: "0.00",
        porcentajeError: "0.00",
        cantidadPruebas: 0,
        mejorPrueba: null,
      }
    })

    let totalAciertos = 0,
      totalErrores = 0,
      totalIntentos = 0

    const pruebasPorTipo = { secuencial: [], aleatorio: [], manual: [] }

    pruebas.forEach((p) => {
      const tipo = p.tipo
      const aciertos = p.cantidad_aciertos || 0
      const errores = p.cantidad_errores || 0
      const intentos = p.cantidad_intentos || aciertos + errores

      totalAciertos += aciertos
      totalErrores += errores
      totalIntentos += intentos

      if (resumenPorTipo[tipo]) {
        resumenPorTipo[tipo].totalAciertos += aciertos
        resumenPorTipo[tipo].totalErrores += errores
        resumenPorTipo[tipo].totalIntentos += intentos
        resumenPorTipo[tipo].cantidadPruebas += 1
        pruebasPorTipo[tipo].push(p)
      }
    })

    tipos.forEach((tipo) => {
      const r = resumenPorTipo[tipo]
      if (r.totalIntentos > 0) {
        r.porcentajeAcierto = ((r.totalAciertos / r.totalIntentos) * 100).toFixed(2)
        r.porcentajeError = ((r.totalErrores / r.totalIntentos) * 100).toFixed(2)
      }
      r.mejorPrueba = encontrarMejorPrueba(pruebasPorTipo[tipo])
    })

    const mejorPruebaGeneral = encontrarMejorPrueba(pruebas)

    const cuenta = pruebas[0].cuenta
    const porcentajeAciertoTotal = totalIntentos > 0 ? ((totalAciertos / totalIntentos) * 100).toFixed(2) : "0.00"
    const porcentajeErrorTotal = totalIntentos > 0 ? ((totalErrores / totalIntentos) * 100).toFixed(2) : "0.00"

    const jugadorSinImagen = cuenta.jugador ? { ...cuenta.jugador.toJSON(), imagen: undefined } : null
    const entrenadorSinImagen = cuenta.entrenador ? { ...cuenta.entrenador.toJSON(), imagen: undefined } : null
    const tecnicoSinImagen = cuenta.tecnico ? { ...cuenta.tecnico.toJSON(), imagen: undefined } : null

    res.json({
      success: true,
      data: {
        periodo,
        cuentaId: cuenta.id,
        jugador: jugadorSinImagen,
        entrenador: entrenadorSinImagen,
        tecnico: tecnicoSinImagen,
        totalPruebas: pruebas.length,
        totalAciertos,
        totalErrores,
        totalIntentos,
        porcentajeAcierto: porcentajeAciertoTotal,
        porcentajeError: porcentajeErrorTotal,
        resumenPorTipo,
        mejorPrueba: mejorPruebaGeneral,
      },
    })
  } catch (error) {
    res.status(500).json({ success: false, message: "Error en rankingPersonal", error: error.message })
  }
}

// ------------------ Ranking General ------------------

// ------------------ Ranking General ------------------
export const rankingGeneral = async (req, res) => {
  try {
    const { periodo = "general", carrera, posicion, limit = 10 } = req.query

    const filtros = { estado: "finalizada" }
    const rangoFechas = calcularRangoFechas(periodo)

    if (rangoFechas) {
      filtros.fecha = { [Op.between]: [rangoFechas.fechaInicio, rangoFechas.fechaFin] }
    }

    const jugadorWhere = {}
    if (carrera) jugadorWhere.carrera = carrera
    if (posicion) jugadorWhere.posicion_principal = posicion

    const pruebas = await Prueba.findAll({
      where: filtros,
      include: [
        {
          model: Cuenta,
          as: "cuenta",
          include: [
            {
              model: Jugador,
              as: "jugador",
              where: Object.keys(jugadorWhere).length > 0 ? jugadorWhere : undefined,
              required: Object.keys(jugadorWhere).length > 0,
            },
            { model: Entrenador, as: "entrenador" },
            { model: Tecnico, as: "tecnico" },
          ],
        },
      ],
    })

    if (pruebas.length === 0) {
      return res.json({
        success: true,
        data: {
          periodo,
          filtros: { carrera, posicion },
          top10: [],
        },
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
          totalPruebas: 0,
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
      const tipo = p.tipo

      jugadoresMap[cuentaId].totalAciertos += aciertos
      jugadoresMap[cuentaId].totalErrores += errores
      jugadoresMap[cuentaId].totalIntentos += intentos
      jugadoresMap[cuentaId].totalPruebas += 1

      if (jugadoresMap[cuentaId].resumenPorTipo[tipo]) {
        jugadoresMap[cuentaId].resumenPorTipo[tipo].totalAciertos += aciertos
        jugadoresMap[cuentaId].resumenPorTipo[tipo].totalErrores += errores
        jugadoresMap[cuentaId].resumenPorTipo[tipo].totalIntentos += intentos
        jugadoresMap[cuentaId].resumenPorTipo[tipo].cantidadPruebas += 1
      }
    })

    const jugadoresArray = Object.values(jugadoresMap).map((j) => {
      const porcentajeAcierto = j.totalIntentos > 0 ? ((j.totalAciertos / j.totalIntentos) * 100).toFixed(2) : "0.00"
      const porcentajeError = j.totalIntentos > 0 ? ((j.totalErrores / j.totalIntentos) * 100).toFixed(2) : "0.00"

      // Calcular porcentajes por tipo
      Object.keys(j.resumenPorTipo).forEach((tipo) => {
        const r = j.resumenPorTipo[tipo]
        r.porcentajeAcierto = r.totalIntentos > 0 ? ((r.totalAciertos / r.totalIntentos) * 100).toFixed(2) : "0.00"
        r.porcentajeError = r.totalIntentos > 0 ? ((r.totalErrores / r.totalIntentos) * 100).toFixed(2) : "0.00"
      })

      const mejorPrueba = encontrarMejorPrueba(pruebas.filter((p) => p.cuentaId === j.cuenta.id))

      const jugadorSinImagen = j.cuenta.jugador ? { ...j.cuenta.jugador.toJSON(), imagen: undefined } : null
      const entrenadorSinImagen = j.cuenta.entrenador ? { ...j.cuenta.entrenador.toJSON(), imagen: undefined } : null
      const tecnicoSinImagen = j.cuenta.tecnico ? { ...j.cuenta.tecnico.toJSON(), imagen: undefined } : null

      return {
        cuentaId: j.cuenta.id,
        jugador: jugadorSinImagen,
        entrenador: entrenadorSinImagen,
        tecnico: tecnicoSinImagen,
        totalPruebas: j.totalPruebas,
        totalAciertos: j.totalAciertos,
        totalErrores: j.totalErrores,
        totalIntentos: j.totalIntentos,
        porcentajeAcierto,
        porcentajeError,
        resumenPorTipo: j.resumenPorTipo,
        mejorPrueba,
      }
    })

    const top10 = jugadoresArray
      .sort((a, b) => Number.parseFloat(b.porcentajeAcierto) - Number.parseFloat(a.porcentajeAcierto))
      .slice(0, Number.parseInt(limit))

    res.json({
      success: true,
      data: {
        periodo,
        filtros: { carrera, posicion },
        top10,
      },
    })
  } catch (error) {
    res.status(500).json({ success: false, message: "Error en rankingGeneral", error: error.message })
  }
}

// 📌 Ranking personal filtrado por POST
export const rankingPersonalFiltrado = async (req, res) => {
  try {
    const { cuentaId, periodo = "general", tipos } = req.body

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

    const rangoFechas = calcularRangoFechas(periodo)
    if (rangoFechas) {
      filtros.fecha = { [Op.between]: [rangoFechas.fechaInicio, rangoFechas.fechaFin] }
    }

    const pruebas = await Prueba.findAll({
      where: filtros,
      include: [
        {
          model: Cuenta,
          as: "cuenta",
          include: [
            { model: Jugador, as: "jugador" },
            { model: Entrenador, as: "entrenador" },
            { model: Tecnico, as: "tecnico" },
          ],
        },
      ],
      order: [["fecha", "DESC"]],
    })

    if (pruebas.length === 0) {
      return res.json({ success: true, data: null })
    }

    // Agrupar por tipo de prueba
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

      const porcentajeAcierto = totalIntentos > 0 ? ((totalAciertos / totalIntentos) * 100).toFixed(2) : "0.00"
      const porcentajeError = totalIntentos > 0 ? ((totalErrores / totalIntentos) * 100).toFixed(2) : "0.00"

      resumenPorTipo[tipo] = {
        tipo,
        cuenta: pruebasTipo[0].cuenta,
        totalAciertos,
        totalErrores,
        totalIntentos,
        porcentajeAcierto,
        porcentajeError,
        cantidadPruebas: pruebasTipo.length,
        mejorPrueba: encontrarMejorPrueba(pruebasTipo),
      }
    })

    res.json({ success: true, data: { periodo, resumenPorTipo } })
  } catch (error) {
    res.status(500).json({ success: false, message: "Error en rankingPersonalFiltrado", error: error.message })
  }
}

// 📌 Ranking general con filtros
export const rankingGeneralFiltrado = async (req, res) => {
  try {
    const { periodo = "general", tipo, carrera, posicion, limit = 10 } = req.body

    const filtros = { estado: "finalizada" }

    const rangoFechas = calcularRangoFechas(periodo)
    if (rangoFechas) {
      filtros.fecha = { [Op.between]: [rangoFechas.fechaInicio, rangoFechas.fechaFin] }
    }

    if (tipo) filtros.tipo = tipo

    const jugadorWhere = {}
    if (carrera) jugadorWhere.carrera = carrera
    if (posicion) jugadorWhere.posicion_principal = posicion

    const pruebas = await Prueba.findAll({
      where: filtros,
      include: [
        {
          model: Cuenta,
          as: "cuenta",
          include: [
            {
              model: Jugador,
              as: "jugador",
              where: Object.keys(jugadorWhere).length > 0 ? jugadorWhere : undefined,
              required: Object.keys(jugadorWhere).length > 0,
            },
            { model: Entrenador, as: "entrenador" },
            { model: Tecnico, as: "tecnico" },
          ],
        },
      ],
    })

    let resultados = calcularEstadisticas(pruebas)
    if (limit) resultados = resultados.slice(0, Number.parseInt(limit))

    res.json({
      success: true,
      data: {
        periodo,
        filtros: { tipo, carrera, posicion },
        resultados,
      },
    })
  } catch (error) {
    res.status(500).json({ success: false, message: "Error en rankingGeneralFiltrado", error: error.message })
  }
}
