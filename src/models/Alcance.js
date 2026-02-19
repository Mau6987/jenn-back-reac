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
  },
  {
    tableName: "alcances",
    timestamps: false,
  },
)