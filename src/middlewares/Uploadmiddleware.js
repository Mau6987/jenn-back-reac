import multer from "multer"

const fileFilter = (req, file, cb) => {
  const allowed = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"]
  if (allowed.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new Error("Formato de imagen no permitido. Use JPG, PNG, GIF o WEBP"), false)
  }
}

// ✅ memoryStorage — no guarda en disco, pasa el buffer a Cloudinary
export const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
})