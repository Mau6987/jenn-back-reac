// controllers/graficosController.js
import { Op } from "sequelize"
import { Cuenta } from "../models/Cuenta.js"
import { Jugador } from "../models/Jugador.js"
import { Reaccion } from "../models/Reaccion.js"

const MODOS = ["manual", "secuencial", "aleatorio"]

const calcularPrecision = (reacciones) => {
  const conDatos = reacciones.filter((r) => (r.cantidad_aciertos || 0) + (r.cantidad_errores || 0) > 0)
  if (!conDatos.length) return null
  const suma = conDatos.reduce((s, r) => {
    const a = r.cantidad_aciertos || 0
    const e = r.cantidad_errores || 0
    return s + (a / (a + e)) * 100
  }, 0)
  return Number((suma / conDatos.length).toFixed(2))
}

const getSemana = (fecha) => {
  const d = new Date(fecha)
  // Semana del estudio: semana 1 = primeras 3 sesiones, etc.
  // Usamos ISO week relativa a la primera fecha del dataset
  return d
}

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/graficos/evolucion-grupal
// Gráfico 1: Evolución semanal del % aciertos por modo (promedio grupal)
// ──────────────────────────────────────────────────────────────────────────────
export const evolucionGrupal = async (req, res) => {
  try {
    const cuentas = await Cuenta.findAll({
      where: { rol: "jugador", activo: true },
      include: [
        { model: Jugador,   as: "jugador",    required: true },
        { model: Reaccion,  as: "reacciones", where: { estado: "finalizada" }, required: false },
      ],
    })

    if (!cuentas.length)
      return res.json({ success: true, data: { semanas: [], series: {} } })

    // Recopilar todas las reacciones con fecha
    const todasReacciones = cuentas.flatMap((c) =>
      (c.reacciones || []).map((r) => ({ ...r.dataValues, cuentaId: c.id }))
    )

    if (!todasReacciones.length)
      return res.json({ success: true, data: { semanas: [], series: {} } })

    // Determinar fecha mínima para calcular semanas relativas
    const fechaMin = new Date(Math.min(...todasReacciones.map((r) => new Date(r.fecha))))
    fechaMin.setHours(0, 0, 0, 0)

    // Asignar semana relativa (1, 2, 3...) a cada reacción
    const conSemana = todasReacciones.map((r) => {
      const diff = new Date(r.fecha) - fechaMin
      const semana = Math.floor(diff / (7 * 24 * 60 * 60 * 1000)) + 1
      return { ...r, semana }
    })

    const maxSemana = Math.max(...conSemana.map((r) => r.semana))
    const semanas = Array.from({ length: maxSemana }, (_, i) => `Semana ${i + 1}`)

    // Por cada modo y semana, calcular promedio grupal de precisión
    const series = {}
    MODOS.forEach((modo) => {
      series[modo] = semanas.map((_, semIdx) => {
        const semana = semIdx + 1
        const reaccionesSemana = conSemana.filter((r) => r.tipo === modo && r.semana === semana)
        return calcularPrecision(reaccionesSemana)
      })
    })

    // Promedio general (media de los 3 modos por semana)
    series["promedio_general"] = semanas.map((_, semIdx) => {
      const valores = MODOS.map((modo) => series[modo][semIdx]).filter((v) => v !== null)
      if (!valores.length) return null
      return Number((valores.reduce((s, v) => s + v, 0) / valores.length).toFixed(2))
    })

    res.json({ success: true, data: { semanas, series } })
  } catch (error) {
    console.error("Error evolucionGrupal:", error)
    res.status(500).json({ success: false, message: "Error al obtener evolución grupal", error: error.message })
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/graficos/ranking-grupal
// Gráfico 2: Ranking grupal de % aciertos promedio por modo
// ──────────────────────────────────────────────────────────────────────────────
export const rankingGrupal = async (req, res) => {
  try {
    const { ultimas = 0 } = req.query // 0 = todas las sesiones

    const cuentas = await Cuenta.findAll({
      where: { rol: "jugador", activo: true },
      include: [
        { model: Jugador,   as: "jugador",    required: true },
        { model: Reaccion,  as: "reacciones", where: { estado: "finalizada" }, required: false,
          order: [["fecha", "DESC"]] },
      ],
    })

    const jugadoras = cuentas.map((c) => {
      const nombre = `${c.jugador.nombres.split(" ")[0]} ${c.jugador.apellidos.split(" ")[0]}`
      const inicial = `${c.jugador.nombres[0]}${c.jugador.apellidos[0]}`

      const precisiones = {}
      MODOS.forEach((modo) => {
        let reacs = (c.reacciones || []).filter((r) => r.tipo === modo)
        if (Number(ultimas) > 0) reacs = reacs.slice(0, Number(ultimas))
        precisiones[modo] = calcularPrecision(reacs)
      })

      // Promedio general del jugador
      const vals = MODOS.map((m) => precisiones[m]).filter((v) => v !== null)
      precisiones["promedio"] = vals.length
        ? Number((vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(2))
        : null

      return { cuentaId: c.id, nombre, inicial, precisiones }
    })

    // Ordenar por promedio general descendente
    jugadoras.sort((a, b) => (b.precisiones.promedio ?? -1) - (a.precisiones.promedio ?? -1))

    res.json({ success: true, data: jugadoras })
  } catch (error) {
    console.error("Error rankingGrupal:", error)
    res.status(500).json({ success: false, message: "Error al obtener ranking grupal", error: error.message })
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/graficos/boxplot
// Gráfico 3: Distribución (boxplot) del % aciertos por modo
// ──────────────────────────────────────────────────────────────────────────────
export const boxplotModos = async (req, res) => {
  try {
    const cuentas = await Cuenta.findAll({
      where: { rol: "jugador", activo: true },
      include: [
        { model: Jugador,   as: "jugador",    required: true },
        { model: Reaccion,  as: "reacciones", where: { estado: "finalizada" }, required: false },
      ],
    })

    const resultado = {}

    MODOS.forEach((modo) => {
      // Recopilar todas las precisiones individuales por sesión (una por reacción)
      const valores = cuentas.flatMap((c) =>
        (c.reacciones || [])
          .filter((r) => r.tipo === modo)
          .map((r) => {
            const a = r.cantidad_aciertos || 0
            const e = r.cantidad_errores || 0
            if (a + e === 0) return null
            return Number(((a / (a + e)) * 100).toFixed(2))
          })
          .filter((v) => v !== null)
      ).sort((a, b) => a - b)

      if (!valores.length) {
        resultado[modo] = { min: null, q1: null, median: null, q3: null, max: null, outliers: [], valores: [] }
        return
      }

      const n = valores.length
      const q1 = valores[Math.floor(n * 0.25)]
      const median = n % 2 === 0
        ? (valores[n / 2 - 1] + valores[n / 2]) / 2
        : valores[Math.floor(n / 2)]
      const q3 = valores[Math.floor(n * 0.75)]
      const iqr = q3 - q1
      const lowerFence = q1 - 1.5 * iqr
      const upperFence = q3 + 1.5 * iqr

      const inliers  = valores.filter((v) => v >= lowerFence && v <= upperFence)
      const outliers = valores.filter((v) => v < lowerFence || v > upperFence)

      resultado[modo] = {
        min:      inliers.length ? Math.min(...inliers) : q1,
        q1:       Number(q1.toFixed(2)),
        median:   Number(median.toFixed(2)),
        q3:       Number(q3.toFixed(2)),
        max:      inliers.length ? Math.max(...inliers) : q3,
        outliers: outliers.map((v) => Number(v.toFixed(2))),
        valores,
        total:    n,
        mean:     Number((valores.reduce((s, v) => s + v, 0) / n).toFixed(2)),
      }
    })

    res.json({ success: true, data: resultado })
  } catch (error) {
    console.error("Error boxplotModos:", error)
    res.status(500).json({ success: false, message: "Error al obtener datos boxplot", error: error.message })
  }
}