import express from "express"
import helmet from "helmet"
import cors from "cors"
import dotenv from "dotenv"
import { connectDB } from "./config/database.js"

// Importar rutas
import authRoutes from "./routes/auth.js"
import cuentasRoutes from "./routes/cuentas.js"
import jugadoresRoutes from "./routes/jugadores.js"
import entrenadorRoutes from "./routes/entrenadores.js"
import tecnicoRoutes from "./routes/tecnicos.js"
import pusherRoutes from "./routes/pusher.js"
import reaccionRoutes from "./routes/Reacciones.js"
import rankingRoutes from "./routes/ranking.js"
import horarioRoutes from "./routes/horarioRoutes.js"
import saltoRoutes from "./routes/Saltoroutes.js"
import alcanceRoutes from "./routes/alcanceRoutes.js"
import rankingMetricasRoutes from "./routes/rankingMetricasRoutes.js"

// Importar modelos para establecer asociaciones
import "./models/index.js"

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3000

// Middlewares de seguridad
app.use(helmet())
app.use(cors())

// Middlewares de parsing
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Middleware de logging en desarrollo
if (process.env.NODE_ENV === "development") {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path} - ${new Date().toISOString()}`)
    next()
  })
}

// Health check
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Servidor funcionando correctamente",
    timestamp: new Date().toISOString(),
  })
})

// Rutas de la API
app.use("/api/auth", authRoutes)
app.use("/api/cuentas", cuentasRoutes)
app.use("/api/jugadores", jugadoresRoutes)
app.use("/api/entrenadores", entrenadorRoutes)
app.use("/api/tecnicos", tecnicoRoutes)
app.use("/api/pusher", pusherRoutes)
app.use("/api/reacciones", reaccionRoutes)
app.use("/api/ranking", rankingRoutes)
app.use("/api/ranking", rankingMetricasRoutes)
app.use("/api/horarios", horarioRoutes)
app.use("/api/saltos", saltoRoutes)
app.use("/api/alcances", alcanceRoutes)

// Middleware de manejo de errores global
app.use((err, req, res, next) => {
  console.error("Error:", err)
  res.status(500).json({
    success: false,
    message: "Error interno del servidor",
    error: process.env.NODE_ENV === "development" ? err.message : "Error interno",
  })
})

// Middleware para rutas no encontradas
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: "Ruta no encontrada",
  })
})

// Iniciar servidor
async function startServer() {
  try {
    await connectDB()
    app.listen(PORT, () => {
      console.log(`🚀 Servidor corriendo en puerto ${PORT}`)
      console.log(`🌍 Ambiente: ${process.env.NODE_ENV}`)
      console.log(`📊 Health check: http://localhost:${PORT}/`)
    })
  } catch (error) {
    console.error("❌ Error al iniciar el servidor:", error)
    process.exit(1)
  }
}

startServer()