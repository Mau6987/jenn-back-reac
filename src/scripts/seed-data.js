import { sequelize } from "../config/database.js";
import { Prueba } from "../models/Prueba.js";

// IDs de cuentas de tu base de datos
const cuentas = [10, 3, 4, 9]; // cuentaId de las cuentas

const seedPruebas = async () => {
  try {
    await sequelize.sync({ force: false }); // solo crea la tabla si no existe

    const pruebasData = [];

    const tipos = ["secuencial", "aleatorio", "manual"];

    cuentas.forEach((cuentaId) => {
      tipos.forEach((tipo) => {
        const aciertos = Math.floor(Math.random() * 15) + 5; // 5 a 19
        const errores = Math.floor(Math.random() * 5); // 0 a 4
        const intentos = aciertos + errores;
        const tiempoInicio = new Date(Date.now() - Math.floor(Math.random() * 600000)); // hasta 10 min antes
        const tiempoFin = new Date();
        const fecha = new Date(); // fecha de la prueba
        const ejerciciosRealizados = Math.floor(Math.random() * 10) + 1; // 1 a 10 ejercicios

        pruebasData.push({
          tipo,
          cuentaId,
          tiempo_inicio: tiempoInicio,
          tiempo_fin: tiempoFin,
          cantidad_aciertos: aciertos,
          cantidad_errores: errores,
          cantidad_intentos: intentos,
          estado: "finalizada",
          fecha,
          ejercicios_realizados: ejerciciosRealizados,
        });
      });
    });

    // Insertar en la base de datos
    await Prueba.bulkCreate(pruebasData);
    console.log("Pruebas simuladas creadas exitosamente");
    process.exit();
  } catch (error) {
    console.error("Error al crear pruebas simuladas:", error);
    process.exit(1);
  }
};

seedPruebas();
