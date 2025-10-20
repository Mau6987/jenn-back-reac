// models/Cuenta.js
import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";
import bcrypt from "bcrypt";

export const Cuenta = sequelize.define(
  "cuentas",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    usuario: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      validate: { len: [3, 50] },
    },
    contraseña: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: { len: [6, 255] },
    },
    rol: {
      type: DataTypes.ENUM("jugador", "entrenador", "tecnico"),
      allowNull: false,
    },
    token: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    activo: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    tableName: "cuentas",
    timestamps: false,
    hooks: {
      beforeCreate: async (cuenta) => {
        if (cuenta.contraseña) {
          const rounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
          cuenta.contraseña = await bcrypt.hash(cuenta.contraseña, rounds);
        }
      },
      beforeUpdate: async (cuenta) => {
        if (cuenta.changed("contraseña")) {
          const rounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
          cuenta.contraseña = await bcrypt.hash(cuenta.contraseña, rounds);
        }
      },
    },
  }
);

Cuenta.prototype.verificarContrasena = async function (pass) {
  return bcrypt.compare(pass, this.contraseña);
};

Cuenta.prototype.toJSON = function () {
  const values = { ...this.get() };
  delete values.contraseña;
  delete values.token;
  return values;
};
