// models/PliometriaActualizada.js
import { DataTypes } from "sequelize"
import { sequelize } from "../config/database.js"

export const Pliometria = sequelize.define(
  "pliometrias",
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
    fuerzaizquierda: {
      type: DataTypes.FLOAT,
      allowNull: false,
      validate: { min: 0 },
    },
    fuerzaderecha: {
      type: DataTypes.FLOAT,
      allowNull: false,
      validate: { min: 0 },
    },
    aceleracion: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
      validate: { min: 0 },
    },
    potencia: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
      validate: { min: 0 },
    },
    movimiento: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    estado: {
      type: DataTypes.ENUM("pendiente", "en_curso", "finalizada"),
      allowNull: false,
      defaultValue: "pendiente",
    },
    fecha: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "pliometrias",
    timestamps: false,
  },
)
