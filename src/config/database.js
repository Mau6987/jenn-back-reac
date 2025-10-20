import { Sequelize } from "sequelize"
import dotenv from "dotenv"

dotenv.config()

export const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: "postgres",
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false,
    },
  },
  logging: process.env.NODE_ENV === "development" ? console.log : false,
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
})

// Función para conectar a la base de datos
export async function connectDB() {
  try {
    await sequelize.authenticate()
    console.log("✅ Base de datos conectada correctamente")
    await sequelize.sync({ alter: true })
    console.log("✅ Tablas sincronizadas correctamente")
  } catch (error) {
    console.error("❌ Error al conectar:", error)
    process.exit(1)
  }
}
