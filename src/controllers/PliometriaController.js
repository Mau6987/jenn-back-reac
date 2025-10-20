// controllers/PliometriaController.js
import { Pliometria, Cuenta } from "../models/index.js";

// Crear nuevo registro de pliometría
export const crearPliometria = async (req, res) => {
  try {
    const { cuentaId, fecha, tipo_de_ejercicio, tiempo_ejecucion, aceleracion, extension_pierna_izq, extension_pierna_der } = req.body;
    const registro = await Pliometria.create({
      cuentaId,
      fecha,
      tipo_de_ejercicio,
      tiempo_ejecucion,
      aceleracion,
      extension_pierna_izq,
      extension_pierna_der
    });
    res.status(201).json({ success: true, message: "Registro creado exitosamente", data: registro });
  } catch (error) {
    res.status(400).json({ success: false, message: "Error al crear registro", error: error.message });
  }
};

// Iniciar plegometría (crea con datos por defecto)
export const iniciarPliometria = async (req, res) => {
  try {
    const { cuentaId, tipo_de_ejercicio } = req.body;
    const registro = await Pliometria.create({
      cuentaId,
      fecha: new Date(),
      tipo_de_ejercicio,
      tiempo_ejecucion: 0,
      aceleracion: 0,
      extension_pierna_izq: 0,
      extension_pierna_der: 0
    });
    res.status(201).json({ success: true, message: "Pliometría iniciada", data: registro });
  } catch (error) {
    res.status(400).json({ success: false, message: "Error al iniciar pliometría", error: error.message });
  }
};

// Finalizar pliometría (actualiza los valores finales)
export const finalizarPliometria = async (req, res) => {
  try {
    const { id } = req.params;
    const { tiempo_ejecucion, aceleracion, extension_pierna_izq, extension_pierna_der } = req.body;
    const registro = await Pliometria.findByPk(id);
    if (!registro) return res.status(404).json({ success: false, message: "Registro no encontrado" });
    await registro.update({ tiempo_ejecucion, aceleracion, extension_pierna_izq, extension_pierna_der });
    res.json({ success: true, message: "Pliometría finalizada", data: registro });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al finalizar pliometría", error: error.message });
  }
};

// Obtener todos los registros de pliometría
export const obtenerPliometrias = async (req, res) => {
  try {
    const registros = await Pliometria.findAll({
      include: [{ model: Cuenta, as: "cuenta", attributes: ["id", "usuario"] }]
    });
    res.json({ success: true, data: registros });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error interno del servidor", error: error.message });
  }
};

// Obtener un registro de pliometría por ID
export const obtenerPliometria = async (req, res) => {
  try {
    const { id } = req.params;
    const registro = await Pliometria.findByPk(id, {
      include: [{ model: Cuenta, as: "cuenta", attributes: ["id", "usuario"] }]
    });
    if (!registro) return res.status(404).json({ success: false, message: "Registro no encontrado" });
    res.json({ success: true, data: registro });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error interno del servidor", error: error.message });
  }
};

// Actualizar un registro de pliometría
export const actualizarPliometria = async (req, res) => {
  try {
    const { id } = req.params;
    const registro = await Pliometria.findByPk(id);
    if (!registro) return res.status(404).json({ success: false, message: "Registro no encontrado" });
    await registro.update(req.body);
    res.json({ success: true, message: "Registro actualizado exitosamente", data: registro });
  } catch (error) {
    res.status(400).json({ success: false, message: "Error al actualizar registro", error: error.message });
  }
};

// Eliminar un registro de pliometría
export const eliminarPliometria = async (req, res) => {
  try {
    const { id } = req.params;
    const registro = await Pliometria.findByPk(id);
    if (!registro) return res.status(404).json({ success: false, message: "Registro no encontrado" });
    await registro.destroy();
    res.json({ success: true, message: "Registro eliminado exitosamente" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error interno del servidor", error: error.message });
  }
};
