import { Buffer } from "buffer";
import { Entrenador, Cuenta } from "../models/index.js";

const validarImagenBase64 = (imagen) => {
  if (!imagen) return true;

  const base64Pattern = /^data:image\/(png|jpg|jpeg|gif|webp);base64,/;
  if (!base64Pattern.test(imagen)) {
    return false;
  }

  const sizeInBytes = (imagen.length * 3) / 4;
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (sizeInBytes > maxSize) {
    return false;
  }

  return true;
};

export const obtenerEntrenadores = async (req, res) => {
  try {
    const entrenadores = await Entrenador.findAll({
      include: [
        {
          model: Cuenta,
          as: "cuenta",
          where: { activo: true },
        },
      ],
    });

    res.json({
      success: true,
      data: entrenadores,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: error.message,
    });
  }
};

export const obtenerEntrenador = async (req, res) => {
  try {
    const { id } = req.params;

    const entrenador = await Entrenador.findOne({
      where: { id },
      include: [
        {
          model: Cuenta,
          as: "cuenta",
          where: { activo: true },
        },
      ],
    });

    if (!entrenador) {
      return res.status(404).json({
        success: false,
        message: "Entrenador no encontrado",
      });
    }

    res.json({
      success: true,
      data: entrenador,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: error.message,
    });
  }
};

export const crearEntrenador = async (req, res) => {
  try {
    const {
      nombres,
      apellidos,
      fecha_nacimiento,
      anos_experiencia_voley,
      numero_celular,
      correo_electronico,
      cuentaId,
      imagen,
    } = req.body;

    if (imagen && !validarImagenBase64(imagen)) {
      return res.status(400).json({
        success: false,
        message:
          "Formato de imagen inválido. Debe ser una imagen base64 válida (PNG, JPG, JPEG, GIF, WEBP) menor a 5MB",
      });
    }

    const nuevo = await Entrenador.create({
      nombres,
      apellidos,
      fecha_nacimiento,
      anos_experiencia_voley,
      numero_celular,
      correo_electronico,
      cuentaId,
      imagen: imagen
        ? Buffer.from(imagen.replace(/^data:image\/\w+;base64,/, ""), "base64")
        : null,
    });

    res.status(201).json({
      success: true,
      message: "Entrenador creado exitosamente",
      data: nuevo,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: error.message,
    });
  }
};

export const actualizarEntrenador = async (req, res) => {
  try {
    const { id } = req.params;
    const { imagen, ...rest } = req.body;

    if (imagen && !validarImagenBase64(imagen)) {
      return res.status(400).json({
        success: false,
        message:
          "Formato de imagen inválido. Debe ser una imagen base64 válida (PNG, JPG, JPEG, GIF, WEBP) menor a 5MB",
      });
    }

    const entrenador = await Entrenador.findOne({
      where: { id },
      include: [
        {
          model: Cuenta,
          as: "cuenta",
          where: { activo: true },
        },
      ],
    });

    if (!entrenador) {
      return res.status(404).json({
        success: false,
        message: "Entrenador no encontrado",
      });
    }

    await entrenador.update({
      ...rest,
      imagen:
        imagen !== undefined
          ? Buffer.from(imagen.replace(/^data:image\/\w+;base64,/, ""), "base64")
          : entrenador.imagen,
    });

    res.json({
      success: true,
      message: "Entrenador actualizado exitosamente",
      data: entrenador,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: error.message,
    });
  }
};

export const eliminarEntrenador = async (req, res) => {
  try {
    const { id } = req.params;

    const entrenador = await Entrenador.findOne({
      where: { id },
      include: [
        {
          model: Cuenta,
          as: "cuenta",
        },
      ],
    });

    if (!entrenador) {
      return res.status(404).json({
        success: false,
        message: "Entrenador no encontrado",
      });
    }

    await entrenador.cuenta.update({ activo: false });

    res.json({
      success: true,
      message: "Entrenador eliminado exitosamente",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: error.message,
    });
  }
};
