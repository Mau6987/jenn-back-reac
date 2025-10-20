// models/index.js
import { Cuenta } from "./Cuenta.js";
import { Jugador } from "./Jugador.js";
import { Entrenador } from "./Entrenador.js";
import { Tecnico } from "./Tecnico.js";
import { Prueba } from "./Prueba.js";
import { Horario } from "./Horario.js";
import { Pliometria } from "./Pliometria.js";

// Asociaciones Usuario ↔ Perfiles
Cuenta.hasOne(Jugador,    { foreignKey: "cuentaId", as: "jugador" });
Cuenta.hasOne(Entrenador, { foreignKey: "cuentaId", as: "entrenador" });
Cuenta.hasOne(Tecnico,    { foreignKey: "cuentaId", as: "tecnico" });

Jugador   .belongsTo(Cuenta, { foreignKey: "cuentaId", as: "cuenta" });
Entrenador.belongsTo(Cuenta, { foreignKey: "cuentaId", as: "cuenta" });
Tecnico   .belongsTo(Cuenta, { foreignKey: "cuentaId", as: "cuenta" });

// Cuenta ↔ Pruebas
Cuenta.hasMany(Prueba, { foreignKey: "cuentaId", as: "pruebas" });
Prueba.belongsTo(Cuenta, { foreignKey: "cuentaId", as: "cuenta" });

// Cuenta ↔ Horarios
// para entrenamientos recurrentes y partidos puntuales
Cuenta.hasMany(Horario, { foreignKey: "cuentaId", as: "horarios" });
Horario.belongsTo(Cuenta, { foreignKey: "cuentaId", as: "cuenta" });

// Cuenta ↔ Pliometrías
Cuenta.hasMany(Pliometria, { foreignKey: "cuentaId", as: "pliometrias" });
Pliometria.belongsTo(Cuenta, { foreignKey: "cuentaId", as: "cuenta" });

export {
  Cuenta,
  Jugador,
  Entrenador,
  Tecnico,
  Prueba,
  Horario,
  Pliometria
};
