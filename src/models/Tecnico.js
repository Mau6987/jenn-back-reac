// models/Tecnico.js
import { DataTypes } from "sequelize"
import { sequelize } from "../config/database.js"

export const Tecnico = sequelize.define(
  "tecnicos",
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
    fecha_nacimiento: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      validate: {
        isDate: true,
        isBefore: new Date().toISOString().split("T")[0],
      },
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
      type: DataTypes.BLOB("long"),
      allowNull: true,
    },
    cuentaId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: "cuentas", key: "id" },
    },
  },
  {
    tableName: "tecnicos",
    timestamps: false,
  },
)
