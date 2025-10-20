import { Tecnico, Cuenta } from "../models/index.js"

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
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: error.message,
    })
  }
}

export const crearTecnico = async (req, res) => {
  try {
    const tecnico = await Tecnico.create(req.body)

    res.status(201).json({
      success: true,
      message: "Técnico creado exitosamente",
      data: tecnico,
    })
  } catch (error) {
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

    await tecnico.update(req.body)

    res.json({
      success: true,
      message: "Técnico actualizado exitosamente",
      data: tecnico,
    })
  } catch (error) {
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

    // Soft delete en la cuenta
    await tecnico.cuenta.update({ activo: false })

    res.json({
      success: true,
      message: "Técnico eliminado exitosamente",
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: error.message,
    })
  }
}
