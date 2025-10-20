// models/Horario.js
import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";

export const Horario = sequelize.define(
  "horarios",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    tipo: {
      type: DataTypes.ENUM("entrenamiento", "partido"),
      allowNull: false,
    },
    is_recurring: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    // Para entrenamientos recurrentes: día de la semana
    dia_semana: {
      type: DataTypes.ENUM(
        "lunes",
        "martes",
        "miércoles",
        "jueves",
        "viernes",
        "sábado",
        "domingo"
      ),
      allowNull: true,
    },
    // Rango de fechas válido para el recurrente
    fecha_inicio: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    fecha_fin: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    // Para partidos puntuales: fecha específica
    fecha_evento: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    hora_inicio: {
      type: DataTypes.TIME,
      allowNull: false,
    },
    hora_fin: {
      type: DataTypes.TIME,
      allowNull: false,
    },
    ubicacion: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
  },
  {
    tableName: "horarios",
    timestamps: false,
  }
);
