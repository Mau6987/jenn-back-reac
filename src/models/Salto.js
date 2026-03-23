// models/Salto.js
import { DataTypes } from "sequelize"
import { sequelize } from "../config/database.js"

export const Salto = sequelize.define(
  "saltos",
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
    tipo: {
      type: DataTypes.ENUM("salto simple", "salto conos"),
      allowNull: false,
    },
    tiempo: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: { min: 0 },
    },
    fuerzaizquierda: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
      validate: { min: 0 },
    },
    fuerzaderecha: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
      validate: { min: 0 },
    },
    aceleracion: {
      type: DataTypes.FLOAT,
      allowNull: true,
      defaultValue: 0,
      validate: { min: 0 },
    },
    potencia: {
      type: DataTypes.FLOAT,
      allowNull: true,
      defaultValue: 0,
      validate: { min: 0 },
    },
    cantidad_saltos: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: { min: 0 },
    },
    indice_fatiga: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
      validate: { min: 0 },
    },
    altura_promedio: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
      validate: { min: 0 },
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
    tableName: "saltos",
    timestamps: false,
  },
)