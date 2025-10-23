// models/Alcance.js
import { DataTypes } from "sequelize"
import { sequelize } from "../config/database.js"

export const Alcance = sequelize.define(
  "alcances",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    cuentaId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: "cuentas", key: "id" },
    },
    tiempodevuelo: {
      type: DataTypes.FLOAT,
      allowNull: false,
      validate: { min: 0 },
    },
    potencia: {
      type: DataTypes.FLOAT,
      allowNull: false,
      validate: { min: 0 },
    },
    velocidad: {
      type: DataTypes.FLOAT,
      allowNull: false,
      validate: { min: 0 },
    },
    alcance: {
      type: DataTypes.FLOAT,
      allowNull: false,
      validate: { min: 0 },
    },
    fecha: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    estado: {
      type: DataTypes.ENUM("pendiente", "en_curso", "finalizada"),
      allowNull: false,
      defaultValue: "pendiente",
    },
  },
  {
    tableName: "alcances",
    timestamps: false,
  },
)
