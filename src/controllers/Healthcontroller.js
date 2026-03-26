
import { sequelize } from "../config/database.js"

// ─── Verificar conexión con el Backend (API) ──────────────────────────────────
export const checkBackend = async (req, res) => {
  const start = Date.now()

  try {
    res.json({
      success:   true,
      status:    "online",
      message:   "API Backend operativa",
      latency:   Date.now() - start,
      timestamp: new Date().toISOString(),
      uptime:    Math.floor(process.uptime()),
      env:       process.env.NODE_ENV || "production",
    })
  } catch (error) {
    res.status(500).json({
      success:   false,
      status:    "error",
      message:   error.message,
      timestamp: new Date().toISOString(),
    })
  }
}

// ─── Verificar conexión con la Base de Datos ──────────────────────────────────
export const checkDatabase = async (req, res) => {
  const start = Date.now()

  try {
    // Ejecutar una query liviana para verificar que la DB responde
    await sequelize.authenticate()

    // Query de prueba: obtiene la hora del servidor PostgreSQL
    const [[{ now }]] = await sequelize.query("SELECT NOW() AS now")

    res.json({
      success:    true,
      status:     "online",
      message:    "Base de datos operativa",
      latency:    Date.now() - start,
      dialect:    sequelize.getDialect(),
      serverTime: now,
      timestamp:  new Date().toISOString(),
    })
  } catch (error) {
    console.error("Error verificando DB:", error)
    res.status(500).json({
      success:   false,
      status:    "failed",
      message:   error.message,
      timestamp: new Date().toISOString(),
    })
  }
}

// ─── Health check combinado (Backend + DB) ────────────────────────────────────
export const checkHealth = async (req, res) => {
  const start = Date.now()

  const result = {
    api:       { status: "online",  latency: null, message: "API Backend operativa" },
    database:  { status: "unknown", latency: null, message: null },
    timestamp: new Date().toISOString(),
    uptime:    Math.floor(process.uptime()),
  }

  // Verificar DB
  const dbStart = Date.now()
  try {
    await sequelize.authenticate()
    result.database.status  = "online"
    result.database.latency = Date.now() - dbStart
    result.database.message = "PostgreSQL operativa"
  } catch (error) {
    result.database.status  = "failed"
    result.database.latency = Date.now() - dbStart
    result.database.message = error.message
  }

  result.api.latency = Date.now() - start

  const allOk = result.database.status === "online"
  res.status(allOk ? 200 : 207).json({
    success: allOk,
    ...result,
  })
}