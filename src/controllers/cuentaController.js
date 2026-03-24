import { Cuenta, Jugador, Entrenador, Tecnico } from "../models/index.js"
import { sequelize } from "../config/database.js"
import bcrypt from "bcrypt"

const sanitizarDatosJugador = (datos) => {
  const resultado = { ...datos }

  // Campos DECIMAL — Sequelize los necesita como número, no string
  const camposDecimal = ["altura", "alcance_estatico"]
  camposDecimal.forEach((campo) => {
    if (resultado[campo] !== undefined && resultado[campo] !== "") {
      resultado[campo] = parseFloat(resultado[campo])
    } else if (resultado[campo] === "") {
      resultado[campo] = null // allowNull: true en el modelo
    }
  })

  // Campos INTEGER
  const camposInteger = ["anos_experiencia_voley"]
  camposInteger.forEach((campo) => {
    if (resultado[campo] !== undefined && resultado[campo] !== "") {
      resultado[campo] = parseInt(resultado[campo], 10)
    }
  })

  return resultado
}

// ========================= OBTENER CUENTAS =========================
export const obtenerCuentas = async (req, res) => {
  try {
    const cuentas = await Cuenta.findAll({
      where: { activo: true },
      include: [
        { model: Jugador,    as: "jugador" },
        { model: Entrenador, as: "entrenador" },
        { model: Tecnico,    as: "tecnico" },
      ],
    })

    res.json({ success: true, data: cuentas })
  } catch (error) {
    console.error("Error al obtener cuentas:", error)
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: error.message,
    })
  }
}

// ========================= OBTENER CUENTA =========================
export const obtenerCuenta = async (req, res) => {
  try {
    const { id } = req.params

    const cuenta = await Cuenta.findOne({
      where: { id, activo: true },
      include: [
        { model: Jugador,    as: "jugador" },
        { model: Entrenador, as: "entrenador" },
        { model: Tecnico,    as: "tecnico" },
      ],
    })

    if (!cuenta) return res.status(404).json({ success: false, message: "Cuenta no encontrada" })

    res.json({ success: true, data: cuenta })
  } catch (error) {
    console.error("Error al obtener cuenta:", error)
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: error.message,
    })
  }
}

// ========================= CREAR CUENTA =========================
export const crearCuenta = async (req, res) => {
  const transaction = await sequelize.transaction()

  try {
    const { usuario, contraseña, rol, path, ...datosPersonales } = req.body

    // path es la ruta de la imagen en el servidor (ej: /uploads/imagen.jpg)
    const cuenta = await Cuenta.create({ usuario, contraseña, rol, path: path || null }, { transaction })

    let registro
    switch (rol) {
      case "jugador":
        registro = await Jugador.create(
          { ...sanitizarDatosJugador(datosPersonales), cuentaId: cuenta.id },
          { transaction },
        )
        break

      case "entrenador":
        registro = await Entrenador.create(
          { ...datosPersonales, cuentaId: cuenta.id },
          { transaction },
        )
        break

      case "tecnico":
        registro = await Tecnico.create(
          { ...datosPersonales, cuentaId: cuenta.id },
          { transaction },
        )
        break
    }

    await transaction.commit()

    res.status(201).json({
      success: true,
      message: "Cuenta creada exitosamente",
      data: { cuenta: cuenta.toJSON(), [rol]: registro.toJSON() },
    })
  } catch (error) {
    await transaction.rollback()
    console.error("Error al crear cuenta:", error)
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: error.message,
    })
  }
}

// ========================= ACTUALIZAR CUENTA =========================
export const actualizarCuenta = async (req, res) => {
  const transaction = await sequelize.transaction()

  try {
    const { id } = req.params
    const { usuario, contraseña, rol, path, ...datosPersonales } = req.body

    const cuenta = await Cuenta.findByPk(id)
    if (!cuenta || !cuenta.activo) {
      await transaction.rollback()
      return res.status(404).json({ success: false, message: "Cuenta no encontrada" })
    }

    const datosActualizacionCuenta = {}
    if (usuario !== undefined) datosActualizacionCuenta.usuario = usuario
    if (rol !== undefined) datosActualizacionCuenta.rol = rol
    if (path !== undefined) datosActualizacionCuenta.path = path
    if (contraseña !== undefined && contraseña !== "") {
      const rounds = parseInt(process.env.BCRYPT_ROUNDS) || 12
      datosActualizacionCuenta.contraseña = await bcrypt.hash(contraseña, rounds)
    }

    if (Object.keys(datosActualizacionCuenta).length > 0) {
      await cuenta.update(datosActualizacionCuenta, { transaction })
    }

    const modeloMap = { jugador: Jugador, entrenador: Entrenador, tecnico: Tecnico }
    const Modelo = modeloMap[cuenta.rol]

    if (Modelo && Object.keys(datosPersonales).length > 0) {
      const dataToUpdate =
        cuenta.rol === "jugador"
          ? sanitizarDatosJugador(datosPersonales)
          : { ...datosPersonales }

      await Modelo.update(dataToUpdate, { where: { cuentaId: cuenta.id }, transaction })
    }

    await transaction.commit()
    res.json({ success: true, message: "Cuenta actualizada exitosamente" })
  } catch (error) {
    await transaction.rollback()
    console.error("Error al actualizar cuenta:", error)
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: error.message,
    })
  }
}

// ========================= ELIMINAR CUENTA =========================
export const eliminarCuenta = async (req, res) => {
  try {
    const { id } = req.params
    const cuenta = await Cuenta.findByPk(id)
    if (!cuenta) return res.status(404).json({ success: false, message: "Cuenta no encontrada" })

    await cuenta.update({ activo: false })
    res.json({ success: true, message: "Cuenta eliminada exitosamente" })
  } catch (error) {
    console.error("Error al eliminar cuenta:", error)
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: error.message,
    })
  }
}

// ========================= PERFIL =========================
export const obtenerPerfil = async (req, res) => {
  try {
    const { id } = req.params
    const cuenta = await Cuenta.findOne({
      where: { id, activo: true },
      attributes: { exclude: ["contraseña"] },
      include: [
        { model: Jugador,    as: "jugador" },
        { model: Entrenador, as: "entrenador" },
        { model: Tecnico,    as: "tecnico" },
      ],
    })

    if (!cuenta) return res.status(404).json({ success: false, message: "Cuenta no encontrada" })

    res.json({ success: true, data: cuenta })
  } catch (error) {
    console.error("Error al obtener perfil:", error)
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: error.message,
    })
  }
}

// ========================= ACTUALIZAR PERFIL =========================
export const actualizarPerfil = async (req, res) => {
  const transaction = await sequelize.transaction()

  try {
    const { id } = req.params
    const { usuario, contraseña, path, ...datosPersonales } = req.body

    const cuenta = await Cuenta.findOne({ where: { id, activo: true }, transaction })
    if (!cuenta) {
      await transaction.rollback()
      return res.status(404).json({ success: false, message: "Cuenta no encontrada" })
    }

    // Actualizar campos de la cuenta
    const datosActualizacionCuenta = {}
    if (usuario !== undefined) datosActualizacionCuenta.usuario = usuario
    if (path !== undefined) datosActualizacionCuenta.path = path
    if (contraseña !== undefined && contraseña !== "") {
      const rounds = parseInt(process.env.BCRYPT_ROUNDS) || 12
      datosActualizacionCuenta.contraseña = await bcrypt.hash(contraseña, rounds)
    }

    if (Object.keys(datosActualizacionCuenta).length > 0) {
      await cuenta.update(datosActualizacionCuenta, { transaction })
    }

    // Actualizar datos específicos del rol (nombres, apellidos, etc.)
    const modeloMap = { jugador: Jugador, entrenador: Entrenador, tecnico: Tecnico }
    const Modelo = modeloMap[cuenta.rol]

    if (Modelo && Object.keys(datosPersonales).length > 0) {
      const dataToUpdate =
        cuenta.rol === "jugador"
          ? sanitizarDatosJugador(datosPersonales)
          : { ...datosPersonales }

      await Modelo.update(dataToUpdate, { where: { cuentaId: cuenta.id }, transaction })
    }

    await transaction.commit()

    const perfilActualizado = await Cuenta.findOne({
      where: { id: cuenta.id, activo: true },
      attributes: { exclude: ["contraseña"] },
      include: [
        { model: Jugador,    as: "jugador" },
        { model: Entrenador, as: "entrenador" },
        { model: Tecnico,    as: "tecnico" },
      ],
    })

    res.json({
      success: true,
      message: "Perfil actualizado exitosamente",
      data: perfilActualizado,
    })
  } catch (error) {
    await transaction.rollback()
    console.error("Error al actualizar perfil:", error)
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: error.message,
    })
  }
}

// ========================= ACTUALIZAR CONTRASEÑA =========================
export const actualizarContrasena = async (req, res) => {
  const transaction = await sequelize.transaction()

  try {
    const { id } = req.params
    const { contraseñaActual, contraseñaNueva } = req.body

    const cuenta = await Cuenta.findOne({ where: { id, activo: true }, transaction })
    if (!cuenta) {
      await transaction.rollback()
      return res.status(404).json({ success: false, message: "Cuenta no encontrada" })
    }

    // Verificar contraseña actual
    const esValida = await bcrypt.compare(contraseñaActual, cuenta.contraseña)
    if (!esValida) {
      await transaction.rollback()
      return res.status(401).json({ success: false, message: "Contraseña actual incorrecta" })
    }

    // Actualizar a nueva contraseña
    const rounds = parseInt(process.env.BCRYPT_ROUNDS) || 12
    const nuevaContrasenaHash = await bcrypt.hash(contraseñaNueva, rounds)
    await cuenta.update({ contraseña: nuevaContrasenaHash }, { transaction })

    await transaction.commit()

    res.json({
      success: true,
      message: "Contraseña actualizada exitosamente",
    })
  } catch (error) {
    await transaction.rollback()
    console.error("Error al actualizar contraseña:", error)
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: error.message,
    })
  }
}