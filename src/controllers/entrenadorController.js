import { Entrenador } from "../models/Entrenador.js"
import { Cuenta } from "../models/Cuenta.js"

// Función auxiliar para validar imagen base64
const validarImagenBase64 = (imagenBase64) => {
  if (!imagenBase64) return null

  // Verificar formato base64
  const base64Regex = /^data:image\/(png|jpg|jpeg|gif|webp);base64,/
  if (!base64Regex.test(imagenBase64)) {
    throw new Error("Formato de imagen inválido. Debe ser base64 con prefijo data:image/")
  }

  // Extraer el contenido base64 sin el prefijo
  const base64Data = imagenBase64.split(",")[1]

  // Verificar tamaño (máximo 5MB)
  const sizeInBytes = (base64Data.length * 3) / 4
  const maxSize = 5 * 1024 * 1024 // 5MB

  if (sizeInBytes > maxSize) {
    throw new Error("La imagen excede el tamaño máximo permitido de 5MB")
  }

  return Buffer.from(base64Data, "base64")
}

// Obtener todos los entrenadores
export const obtenerEntrenadores = async (req, res) => {
  try {
    const entrenadores = await Entrenador.findAll({
      include: [
        {
          model: Cuenta,
          as: "cuenta",
          attributes: ["id", "usuario", "rol"],
        },
      ],
    })

    // Convertir imagen a base64 para enviar al frontend
    const entrenadoresConImagen = entrenadores.map((entrenador) => {
      const entrenadorJSON = entrenador.toJSON()
      if (entrenadorJSON.imagen) {
        const base64Image = entrenadorJSON.imagen.toString("base64")
        entrenadorJSON.imagen = `data:image/jpeg;base64,${base64Image}`
      }
      return entrenadorJSON
    })

    res.json(entrenadoresConImagen)
  } catch (error) {
    res.status(500).json({
      mensaje: "Error al obtener entrenadores",
      error: error.message,
    })
  }
}

// Obtener un entrenador por ID
export const obtenerEntrenador = async (req, res) => {
  try {
    const { id } = req.params
    const entrenador = await Entrenador.findByPk(id, {
      include: [
        {
          model: Cuenta,
          as: "cuenta",
          attributes: ["id", "usuario", "rol"],
        },
      ],
    })

    if (!entrenador) {
      return res.status(404).json({ mensaje: "Entrenador no encontrado" })
    }

    // Convertir imagen a base64
    const entrenadorJSON = entrenador.toJSON()
    if (entrenadorJSON.imagen) {
      const base64Image = entrenadorJSON.imagen.toString("base64")
      entrenadorJSON.imagen = `data:image/jpeg;base64,${base64Image}`
    }

    res.json(entrenadorJSON)
  } catch (error) {
    res.status(500).json({
      mensaje: "Error al obtener entrenador",
      error: error.message,
    })
  }
}

// Crear un nuevo entrenador
export const crearEntrenador = async (req, res) => {
  try {
    const { imagen, ...datosEntrenador } = req.body

    // Validar que la cuenta existe
    const cuenta = await Cuenta.findByPk(datosEntrenador.cuentaId)
    if (!cuenta) {
      return res.status(404).json({ mensaje: "Cuenta no encontrada" })
    }

    // Validar y convertir imagen si existe
    let imagenBuffer = null
    if (imagen) {
      imagenBuffer = validarImagenBase64(imagen)
    }

    const nuevoEntrenador = await Entrenador.create({
      ...datosEntrenador,
      imagen: imagenBuffer,
    })

    // Convertir imagen a base64 para la respuesta
    const entrenadorJSON = nuevoEntrenador.toJSON()
    if (entrenadorJSON.imagen) {
      const base64Image = entrenadorJSON.imagen.toString("base64")
      entrenadorJSON.imagen = `data:image/jpeg;base64,${base64Image}`
    }

    res.status(201).json(entrenadorJSON)
  } catch (error) {
    res.status(400).json({
      mensaje: "Error al crear entrenador",
      error: error.message,
    })
  }
}

// Actualizar un entrenador
export const actualizarEntrenador = async (req, res) => {
  try {
    const { id } = req.params
    const { imagen, ...datosEntrenador } = req.body

    const entrenador = await Entrenador.findByPk(id)
    if (!entrenador) {
      return res.status(404).json({ mensaje: "Entrenador no encontrado" })
    }

    // Si se envía una nueva cuenta, validar que existe
    if (datosEntrenador.cuentaId) {
      const cuenta = await Cuenta.findByPk(datosEntrenador.cuentaId)
      if (!cuenta) {
        return res.status(404).json({ mensaje: "Cuenta no encontrada" })
      }
    }

    // Validar y convertir imagen si existe
    let imagenBuffer = undefined
    if (imagen !== undefined) {
      imagenBuffer = imagen ? validarImagenBase64(imagen) : null
    }

    await entrenador.update({
      ...datosEntrenador,
      ...(imagenBuffer !== undefined && { imagen: imagenBuffer }),
    })

    // Convertir imagen a base64 para la respuesta
    const entrenadorJSON = entrenador.toJSON()
    if (entrenadorJSON.imagen) {
      const base64Image = entrenadorJSON.imagen.toString("base64")
      entrenadorJSON.imagen = `data:image/jpeg;base64,${base64Image}`
    }

    res.json(entrenadorJSON)
  } catch (error) {
    res.status(400).json({
      mensaje: "Error al actualizar entrenador",
      error: error.message,
    })
  }
}

// Eliminar un entrenador
export const eliminarEntrenador = async (req, res) => {
  try {
    const { id } = req.params
    const entrenador = await Entrenador.findByPk(id)

    if (!entrenador) {
      return res.status(404).json({ mensaje: "Entrenador no encontrado" })
    }

    await entrenador.destroy()
    res.json({ mensaje: "Entrenador eliminado correctamente" })
  } catch (error) {
    res.status(500).json({
      mensaje: "Error al eliminar entrenador",
      error: error.message,
    })
  }
}
