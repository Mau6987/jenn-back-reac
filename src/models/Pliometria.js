// models/Pliometria.js
import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";

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
    fecha: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    tipo_de_ejercicio: {
      type: DataTypes.ENUM("salto_simple", "salto_cajon", "salto_valla"),
      allowNull: false,
    },
    tiempo_ejecucion: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    aceleracion: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    extension_pierna_izq: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    extension_pierna_der: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
  },
  {
    tableName: "pliometrias",
    timestamps: false,
  }
);
