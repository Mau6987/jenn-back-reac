// models/index.js
import { Cuenta } from "./Cuenta.js"
import { Jugador } from "./Jugador.js"
import { Entrenador } from "./Entrenador.js"
import { Tecnico } from "./Tecnico.js"
import { Reaccion } from "./Reaccion.js"
import { Horario } from "./Horario.js"
import { Salto } from "./Salto.js"
import { Alcance } from "./Alcance.js"

// Asociaciones Cuenta ↔ Perfiles
Cuenta.hasOne(Jugador, { foreignKey: "cuentaId", as: "jugador" })
Cuenta.hasOne(Entrenador, { foreignKey: "cuentaId", as: "entrenador" })
Cuenta.hasOne(Tecnico, { foreignKey: "cuentaId", as: "tecnico" })

Jugador.belongsTo(Cuenta, { foreignKey: "cuentaId", as: "cuenta" })
Entrenador.belongsTo(Cuenta, { foreignKey: "cuentaId", as: "cuenta" })
Tecnico.belongsTo(Cuenta, { foreignKey: "cuentaId", as: "cuenta" })

// Cuenta ↔ Reacciones
Cuenta.hasMany(Reaccion, { foreignKey: "cuentaId", as: "reacciones" })
Reaccion.belongsTo(Cuenta, { foreignKey: "cuentaId", as: "cuenta" })

// Cuenta ↔ Horarios
Cuenta.hasMany(Horario, { foreignKey: "cuentaId", as: "horarios" })
Horario.belongsTo(Cuenta, { foreignKey: "cuentaId", as: "cuenta" })

// Cuenta ↔ Saltos
Cuenta.hasMany(Salto, { foreignKey: "cuentaId", as: "saltos" })
Salto.belongsTo(Cuenta, { foreignKey: "cuentaId", as: "cuenta" })

// Cuenta ↔ Alcances
Cuenta.hasMany(Alcance, { foreignKey: "cuentaId", as: "alcances" })
Alcance.belongsTo(Cuenta, { foreignKey: "cuentaId", as: "cuenta" })

export { Cuenta, Jugador, Entrenador, Tecnico, Reaccion, Horario, Salto, Alcance }