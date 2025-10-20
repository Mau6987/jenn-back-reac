import express from "express";
import helmet from "helmet";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./config/database.js";

// Importar rutas
import authRoutes from "./routes/auth.js";
import cuentasRoutes from "./routes/cuentas.js";
import jugadoresRoutes from "./routes/jugadores.js";
import entrenadoresRoutes from "./routes/entrenadores.js";
import tecnicosRoutes from "./routes/tecnicos.js";
import pusherRoutes from "./routes/pusher.js";
import pruebaRoutes from "./routes/pruebas.js";
import rankingRoutes from "./routes/ranking.js";
import horarioRoutes from "./routes/horarioRoutes.js";
import pliometriaRoutes from "./routes/pliometriaRoutes.js ";

// Importar modelos para establecer asociaciones
import "./models/index.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares de seguridad
app.use(helmet());
app.use(cors());

// Middlewares de parsing
// Middlewares de parsing con límite aumentado para imágenes base64
app.use(express.json({ limit: "10mb" })); // puedes subir a "20mb" si lo necesitas
app.use(express.urlencoded({ limit: "10mb", extended: true }));


// Middleware de logging en desarrollo
if (process.env.NODE_ENV === "development") {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path} - ${new Date().toISOString()}`);
    next();
  });
}

// Health check
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Servidor funcionando correctamente",
    timestamp: new Date().toISOString(),
  });
});

// Rutas de la API
app.use("/api/auth", authRoutes);
app.use("/api/cuentas", cuentasRoutes);
app.use("/api/jugadores", jugadoresRoutes);
app.use("/api/entrenadores", entrenadoresRoutes);
app.use("/api/tecnicos", tecnicosRoutes);
app.use("/api/pusher", pusherRoutes);
app.use("/api/pruebas", pruebaRoutes);
app.use("/api/ranking", rankingRoutes);
app.use("/api/horarios", horarioRoutes);
app.use("/api/pliometrias", pliometriaRoutes);

// Middleware de manejo de errores global
app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(500).json({
    success: false,
    message: "Error interno del servidor",
    error: process.env.NODE_ENV === "development" ? err.message : "Error interno",
  });
});

// Middleware para rutas no encontradas
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: "Ruta no encontrada",
  });
});

// Iniciar servidor
async function startServer() {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
      console.log(`🌍 Ambiente: ${process.env.NODE_ENV}`);
      console.log(`📊 Health check: http://localhost:${PORT}/`);
    });
  } catch (error) {
    console.error("❌ Error al iniciar el servidor:", error);
    process.exit(1);
  }
}

startServer();
