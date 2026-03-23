// routes/uploadRoutes.js
import express from "express"
import { upload } from "../middlewares/Uploadmiddleware.js"
import { subirImagen, eliminarImagen } from "../controllers/Uploadcontroller.js"

const router = express.Router()

// POST /api/upload/imagen  — recibe campo "imagen" (multipart/form-data)
router.post("/imagen", upload.single("imagen"), subirImagen)

// DELETE /api/upload/imagen/:filename
router.delete("/imagen/:filename", eliminarImagen)

export default router