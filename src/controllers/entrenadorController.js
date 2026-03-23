import { Entrenador } from "../models/Entrenador.js"
import { Cuenta } from "../models/Cuenta.js"

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

    res.json(entrenadores)
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

    res.json(entrenador)
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
    const { ...datosEntrenador } = req.body

    // Validar que la cuenta existe
    const cuenta = await Cuenta.findByPk(datosEntrenador.cuentaId)
    if (!cuenta) {
      return res.status(404).json({ mensaje: "Cuenta no encontrada" })
    }

    const nuevoEntrenador = await Entrenador.create(datosEntrenador)

    res.status(201).json(nuevoEntrenador)
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
    const datosEntrenador = req.body

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

    await entrenador.update(datosEntrenador)

    res.json(entrenador)
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