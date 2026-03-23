import { v2 as cloudinary } from "cloudinary"

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export const subirImagen = (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No se recibió ninguna imagen" })
    }

    // Subir buffer directamente a Cloudinary
    const stream = cloudinary.uploader.upload_stream(
      { folder: "volleyapp" },
      (error, result) => {
        if (error) {
          console.error("Error Cloudinary:", error)
          return res.status(500).json({ success: false, message: "Error al subir imagen" })
        }

        res.json({
          success: true,
          message: "Imagen subida correctamente",
          data: { path: result.secure_url }, // ✅ URL pública permanente
        })
      }
    )

    stream.end(req.file.buffer)
  } catch (error) {
    console.error("Error al subir imagen:", error)
    res.status(500).json({ success: false, message: "Error al subir imagen", error: error.message })
  }
}

export const eliminarImagen = async (req, res) => {
  try {
    const { filename } = req.params
    // filename aquí sería el public_id de Cloudinary
    await cloudinary.uploader.destroy(`volleyapp/${filename}`)
    res.json({ success: true, message: "Imagen eliminada correctamente" })
  } catch (error) {
    console.error("Error al eliminar imagen:", error)
    res.status(500).json({ success: false, message: "Error al eliminar imagen", error: error.message })
  }
}