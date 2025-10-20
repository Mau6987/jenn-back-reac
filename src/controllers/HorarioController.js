// controllers/HorarioController.js
import { Horario, Cuenta } from "../models/index.js";

// Crear nuevo horario (entrenamiento recurrente o partido puntual)
export const crearHorario = async (req, res) => {
  try {
    const { tipo, is_recurring, dia_semana, fecha_inicio, fecha_fin, fecha_evento, hora_inicio, hora_fin, ubicacion, cuentaId } = req.body;
    const horario = await Horario.create({
      tipo,
      is_recurring,
      dia_semana,
      fecha_inicio,
      fecha_fin,
      fecha_evento,
      hora_inicio,
      hora_fin,
      ubicacion,
      cuentaId
    });
    res.status(201).json({ success: true, message: "Horario creado exitosamente", data: horario });
  } catch (error) {
    res.status(400).json({ success: false, message: "Error al crear horario", error: error.message });
  }
};

// Obtener todos los horarios (incluye quién lo creó)
export const obtenerHorarios = async (req, res) => {
  try {
    const horarios = await Horario.findAll({
      include: [{ model: Cuenta, as: "cuenta", attributes: ["id", "usuario"] }]
    });
    res.json({ success: true, data: horarios });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error interno del servidor", error: error.message });
  }
};

// Obtener un horario por ID
export const obtenerHorario = async (req, res) => {
  try {
    const { id } = req.params;
    const horario = await Horario.findByPk(id, {
      include: [{ model: Cuenta, as: "cuenta", attributes: ["id", "usuario"] }]
    });
    if (!horario) return res.status(404).json({ success: false, message: "Horario no encontrado" });
    res.json({ success: true, data: horario });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error interno del servidor", error: error.message });
  }
};

// Actualizar un horario existente
export const actualizarHorario = async (req, res) => {
  try {
    const { id } = req.params;
    const horario = await Horario.findByPk(id);
    if (!horario) return res.status(404).json({ success: false, message: "Horario no encontrado" });
    await horario.update(req.body);
    res.json({ success: true, message: "Horario actualizado exitosamente", data: horario });
  } catch (error) {
    res.status(400).json({ success: false, message: "Error al actualizar horario", error: error.message });
  }
};
//CAMBIO PARA QUE RECONOXCA
// Eliminar un horario
export const eliminarHorario = async (req, res) => {
  try {
    const { id } = req.params;
    const horario = await Horario.findByPk(id);
    if (!horario) return res.status(404).json({ success: false, message: "Horario no encontrado" });
    await horario.destroy();
    res.json({ success: true, message: "Horario eliminado exitosamente" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error interno del servidor", error: error.message });
  }
};
