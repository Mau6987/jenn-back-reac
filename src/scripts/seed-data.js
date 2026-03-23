import { sequelize } from "../config/database.js"
import { Cuenta } from "../models/Cuenta.js"
import { Tecnico } from "../models/Tecnico.js"

const tecnicoData = {
  cuenta: {
    usuario: "jennros",
    contraseña: "jennros",
    rol: "tecnico",
    activo: true,
  },
  tecnico: {
    nombres: "Jennifer Roscio ",
    apellidos: "Trevino Camacho",
    correo_institucional: "jenntrev@gmail.com",
    numero_celular: "60352275",
    fecha_nacimiento: "2001-11-06",
  },
}

const seedTecnico = async () => {
  try {
    await sequelize.sync({ force: false })

    console.log("Creando técnico...")

    // Crear cuenta
    const cuenta = await Cuenta.create(tecnicoData.cuenta)
    console.log(`✓ Cuenta creada: ${cuenta.usuario}`)

    // Crear técnico asociado
    const tecnico = await Tecnico.create({
      ...tecnicoData.tecnico,
      cuentaId: cuenta.id,
    })
    console.log(`✓ Técnico creado: ${tecnico.nombres} ${tecnico.apellidos}`)

    console.log("\n✅ Técnico creado exitosamente")
    process.exit()
  } catch (error) {
    console.error("❌ Error al crear técnico:", error)
    process.exit(1)
  }
}

seedTecnico()
