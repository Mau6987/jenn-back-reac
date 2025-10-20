import { Router } from "express"
import { 
  obtenerCuentas, 
  obtenerCuenta, 
  crearCuenta, 
  actualizarCuenta, 
  eliminarCuenta, 
  obtenerPerfil, 
  actualizarPerfil   // 👈 importar el nuevo controlador
} from "../controllers/cuentaController.js"
import { validarCuenta, validarId } from "../middlewares/validations.js"

const router = Router()

// 🔹 Rutas sin permisos
router.get("/", obtenerCuentas)
router.get("/:id", validarId, obtenerCuenta)
router.post("/", validarCuenta, crearCuenta)
router.put("/:id", validarId, actualizarCuenta)
router.delete("/:id", validarId, eliminarCuenta)
router.get("/perfil/:id", validarId, obtenerPerfil)
router.put("/perfil/:id", validarId, actualizarPerfil)   // 👈 nueva ruta

export default router
