import { Buffer } from "buffer"
import { Cuenta, Jugador, Entrenador, Tecnico } from "../models/index.js"
import { sequelize } from "../config/database.js"

const validarImagenBase64 = (imagen) => {
  if (!imagen) return true

  const base64Pattern = /^data:image\/(png|jpg|jpeg|gif|webp);base64,/
  if (!base64Pattern.test(imagen)) return false

  const sizeInBytes = (imagen.length * 3) / 4
  const maxSize = 5 * 1024 * 1024 // 5MB
  return sizeInBytes <= maxSize
}

const convertirBase64ABuffer = (imagenBase64) => {
  if (!imagenBase64) return null
  return Buffer.from(imagenBase64.replace(/^data:image\/\w+;base64,/, ""), "base64")
}

// ========================= OBTENER CUENTAS =========================
export const obtenerCuentas = async (req, res) => {
  try {
    const cuentas = await Cuenta.findAll({
      where: { activo: true },
      include: [
        { model: Jugador, as: "jugador" },
        { model: Entrenador, as: "entrenador" },
        { model: Tecnico, as: "tecnico" },
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
        { model: Jugador, as: "jugador" },
        { model: Entrenador, as: "entrenador" },
        { model: Tecnico, as: "tecnico" },
      ],
    })
//asd

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
    const { usuario, contraseña, rol, imagen, ...datosPersonales } = req.body

    if (imagen && !validarImagenBase64(imagen)) {
      await transaction.rollback()
      return res.status(400).json({
        success: false,
        message: "Formato de imagen inválido. Debe ser base64 válida (PNG, JPG, JPEG, GIF, WEBP) menor a 5MB",
      })
    }

    const cuenta = await Cuenta.create({ usuario, contraseña, rol }, { transaction })

    let registro
    switch (rol) {
      case "jugador":
        registro = await Jugador.create(
          {
            ...datosPersonales,
            cuentaId: cuenta.id,
            imagen: convertirBase64ABuffer(imagen),
          },
          { transaction },
        )
        break

      case "entrenador":
        registro = await Entrenador.create(
          {
            ...datosPersonales,
            cuentaId: cuenta.id,
            imagen: convertirBase64ABuffer(imagen),
          },
          { transaction },
        )
        break

      case "tecnico":
        registro = await Tecnico.create({ ...datosPersonales, cuentaId: cuenta.id }, { transaction })
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
    const { usuario, contraseña, rol, imagen, ...datosPersonales } = req.body

    if (imagen && !validarImagenBase64(imagen)) {
      await transaction.rollback()
      return res.status(400).json({
        success: false,
        message: "Formato de imagen inválido. Debe ser base64 válida (PNG, JPG, JPEG, GIF, WEBP) menor a 5MB",
      })
    }

    const cuenta = await Cuenta.findByPk(id)
    if (!cuenta || !cuenta.activo) {
      await transaction.rollback()
      return res.status(404).json({ success: false, message: "Cuenta no encontrada" })
    }

    await cuenta.update(
      {
        usuario: usuario || cuenta.usuario,
        contraseña: contraseña || cuenta.contraseña,
        rol: rol || cuenta.rol,
      },
      { transaction },
    )

    const modeloMap = { jugador: Jugador, entrenador: Entrenador, tecnico: Tecnico }
    const Modelo = modeloMap[cuenta.rol]

    if (Modelo && Object.keys(datosPersonales).length > 0) {
      const dataToUpdate = { ...datosPersonales }

      if (cuenta.rol === "jugador") {
        if (imagen !== undefined) {
          dataToUpdate.imagen = convertirBase64ABuffer(imagen)
        }
        // Los campos de jugador incluyendo alcance_estatico se actualizan automáticamente
      } else if (cuenta.rol === "entrenador" && imagen !== undefined) {
        dataToUpdate.imagen = convertirBase64ABuffer(imagen)
      }

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
        { model: Jugador, as: "jugador" },
        { model: Entrenador, as: "entrenador" },
        { model: Tecnico, as: "tecnico" },
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
    const { usuario, imagen, ...datosPersonales } = req.body

    if (imagen && !validarImagenBase64(imagen)) {
      await transaction.rollback()
      return res.status(400).json({
        success: false,
        message: "Formato de imagen inválido. Debe ser base64 válida (PNG, JPG, JPEG, GIF, WEBP) menor a 5MB",
      })
    }

    const cuenta = await Cuenta.findOne({ where: { id, activo: true }, transaction })
    if (!cuenta) {
      await transaction.rollback()
      return res.status(404).json({ success: false, message: "Cuenta no encontrada" })
    }

    if (usuario) await cuenta.update({ usuario }, { transaction })

    const modeloMap = { jugador: Jugador, entrenador: Entrenador, tecnico: Tecnico }
    const Modelo = modeloMap[cuenta.rol]
    if (Modelo && Object.keys(datosPersonales).length > 0) {
      const dataToUpdate = { ...datosPersonales }

      if (cuenta.rol === "jugador") {
        if (imagen !== undefined) {
          dataToUpdate.imagen = convertirBase64ABuffer(imagen)
        }
        // Los campos de jugador incluyendo alcance_estatico se actualizan automáticamente
      } else if (cuenta.rol === "entrenador" && imagen !== undefined) {
        dataToUpdate.imagen = convertirBase64ABuffer(imagen)
      }

      await Modelo.update(dataToUpdate, { where: { cuentaId: cuenta.id }, transaction })
    }

    await transaction.commit()

    const perfilActualizado = await Cuenta.findOne({
      where: { id: cuenta.id, activo: true },
      attributes: { exclude: ["contraseña"] },
      include: [
        { model: Jugador, as: "jugador" },
        { model: Entrenador, as: "entrenador" },
        { model: Tecnico, as: "tecnico" },
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
