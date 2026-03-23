// controllers/uploadController.js
import path from "path"
import fs from "fs"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// ✅ Subir dos niveles desde controllers/ hasta la raíz del proyecto
const uploadsBase = path.join(__dirname, "..", "..", "uploads", "imagenes")

export const subirImagen = (req, res) => {
  console.log("📁 req.file:", req.file) // 👈 confirmar que llega
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No se recibió ninguna imagen" })
    }

    const filePath = `/uploads/imagenes/${req.file.filename}`

    res.json({
      success: true,
      message: "Imagen subida correctamente",
      data: { path: filePath },
    })
  } catch (error) {
    console.error("Error al subir imagen:", error)
    res.status(500).json({ success: false, message: "Error al subir imagen", error: error.message })
  }
}

export const eliminarImagen = (req, res) => {
  try {
    const { filename } = req.params
    const filePath = path.join(uploadsBase, filename)

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: "Imagen no encontrada" })
    }

    fs.unlinkSync(filePath)
    res.json({ success: true, message: "Imagen eliminada correctamente" })
  } catch (error) {
    console.error("Error al eliminar imagen:", error)
    res.status(500).json({ success: false, message: "Error al eliminar imagen", error: error.message })
  }
}