// models/Prueba.js
import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";

export const Prueba = sequelize.define(
  "pruebas",
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
      type: DataTypes.ENUM("manual", "secuencial", "aleatorio"),
      allowNull: false,
    },
    cantidad_intentos: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
      validate: { min: 0 },
    },
    cantidad_aciertos: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
      validate: { min: 0 },
    },
    cantidad_errores: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
      validate: { min: 0 },
    },
    tiempo_inicio: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    tiempo_fin: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    fecha: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: DataTypes.NOW,
    },
    estado: {
      type: DataTypes.ENUM("pendiente", "en_curso", "finalizada"),
      allowNull: false,
      defaultValue: "pendiente",
    },
  },
  {
    tableName: "pruebas",
    timestamps: false,
  }
);
