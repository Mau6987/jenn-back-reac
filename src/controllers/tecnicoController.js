import { Buffer } from "buffer"
import { Tecnico, Cuenta } from "../models/index.js"

const validarImagenBase64 = (imagen) => {
  if (!imagen) return true

  const base64Pattern = /^data:image\/(png|jpg|jpeg|gif|webp);base64,/
  if (!base64Pattern.test(imagen)) {
    return false
  }

  const sizeInBytes = (imagen.length * 3) / 4
  const maxSize = 5 * 1024 * 1024 // 5MB
  if (sizeInBytes > maxSize) {
    return false
  }

  return true
}

const convertirBase64ABuffer = (imagenBase64) => {
  if (!imagenBase64) return null
  return Buffer.from(imagenBase64.replace(/^data:image\/\w+;base64,/, ""), "base64")
}

export const obtenerTecnicos = async (req, res) => {
  try {
    const tecnicos = await Tecnico.findAll({
      include: [
        {
          model: Cuenta,
          as: "cuenta",
          where: { activo: true },
        },
      ],
    })

    res.json({
      success: true,
      data: tecnicos,
    })
  } catch (error) {
    console.error("Error al obtener técnicos:", error)
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: error.message,
    })
  }
}

export const obtenerTecnico = async (req, res) => {
  try {
    const { id } = req.params

    const tecnico = await Tecnico.findOne({
      where: { id },
      include: [
        {
          model: Cuenta,
          as: "cuenta",
          where: { activo: true },
        },
      ],
    })

    if (!tecnico) {
      return res.status(404).json({
        success: false,
        message: "Técnico no encontrado",
      })
    }

    res.json({
      success: true,
      data: tecnico,
    })
  } catch (error) {
    console.error("Error al obtener técnico:", error)
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: error.message,
    })
  }
}

export const crearTecnico = async (req, res) => {
  try {
    const { nombres, apellidos, fecha_nacimiento, correo_institucional, numero_celular, cuentaId, imagen } = req.body

    if (imagen && !validarImagenBase64(imagen)) {
      return res.status(400).json({
        success: false,
        message:
          "Formato de imagen inválido. Debe ser una imagen base64 válida (PNG, JPG, JPEG, GIF, WEBP) menor a 5MB",
      })
    }

    const nuevoTecnico = await Tecnico.create({
      nombres,
      apellidos,
      fecha_nacimiento,
      correo_institucional,
      numero_celular,
      cuentaId,
      imagen: convertirBase64ABuffer(imagen),
    })

    res.status(201).json({
      success: true,
      message: "Técnico creado exitosamente",
      data: nuevoTecnico,
    })
  } catch (error) {
    console.error("Error al crear técnico:", error)
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: error.message,
    })
  }
}

export const actualizarTecnico = async (req, res) => {
  try {
    const { id } = req.params
    const { imagen, ...otros } = req.body

    if (imagen && !validarImagenBase64(imagen)) {
      return res.status(400).json({
        success: false,
        message:
          "Formato de imagen inválido. Debe ser una imagen base64 válida (PNG, JPG, JPEG, GIF, WEBP) menor a 5MB",
      })
    }

    const tecnico = await Tecnico.findOne({
      where: { id },
      include: [
        {
          model: Cuenta,
          as: "cuenta",
          where: { activo: true },
        },
      ],
    })

    if (!tecnico) {
      return res.status(404).json({
        success: false,
        message: "Técnico no encontrado",
      })
    }

    const datosActualizacion = {
      ...otros,
    }

    // Solo actualizar imagen si se proporciona
    if (imagen !== undefined) {
      datosActualizacion.imagen = convertirBase64ABuffer(imagen)
    }

    await tecnico.update(datosActualizacion)

    res.json({
      success: true,
      message: "Técnico actualizado exitosamente",
      data: tecnico,
    })
  } catch (error) {
    console.error("Error al actualizar técnico:", error)
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: error.message,
    })
  }
}

export const eliminarTecnico = async (req, res) => {
  try {
    const { id } = req.params

    const tecnico = await Tecnico.findOne({
      where: { id },
      include: [
        {
          model: Cuenta,
          as: "cuenta",
        },
      ],
    })

    if (!tecnico) {
      return res.status(404).json({
        success: false,
        message: "Técnico no encontrado",
      })
    }

    await tecnico.cuenta.update({ activo: false })

    res.json({
      success: true,
      message: "Técnico eliminado exitosamente",
    })
  } catch (error) {
    console.error("Error al eliminar técnico:", error)
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: error.message,
    })
  }
}
