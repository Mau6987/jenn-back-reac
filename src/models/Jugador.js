// models/Jugador.js
import { DataTypes } from "sequelize"
import { sequelize } from "../config/database.js"

export const Jugador = sequelize.define(
  "jugadores",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    nombres: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: { len: [2, 100] },
    },
    apellidos: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: { len: [2, 100] },
    },
    carrera: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: { len: [2, 100] },
    },
    posicion_principal: {
      type: DataTypes.ENUM("armador", "opuesto", "central", "receptor", "libero", "punta"),
      allowNull: false,
    },
    fecha_nacimiento: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      validate: {
        isDate: true,
        isBefore: new Date().toISOString().split("T")[0],
      },
    },
    altura: {
      type: DataTypes.DECIMAL(3, 2),
      allowNull: false,
      validate: { min: 1.5, max: 2.2 },
    },
    alcance_estatico: {
      type: DataTypes.DECIMAL(3, 2),
      allowNull: false,
      validate: { min: 1.5, max: 2.5 },
    },
    anos_experiencia_voley: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { min: 0, max: 20 },
    },
    correo_institucional: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: { isEmail: true },
    },
    numero_celular: {
      type: DataTypes.STRING(15),
      allowNull: false,
      validate: { len: [8, 15], isNumeric: true },
    },
    imagen: {
      type: DataTypes.BLOB,
      allowNull: true,
    },
    cuentaId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: "cuentas", key: "id" },
    },
  },
  {
    tableName: "jugadores",
    timestamps: false,
  },
)

Jugador.prototype.toJSON = function () {
  const values = { ...this.get() }

  // Convertir imagen principal a base64 si existe
  if (values.imagen && Buffer.isBuffer(values.imagen)) {
    values.imagen = `data:image/jpeg;base64,${values.imagen.toString("base64")}`
  }

  return values
}
