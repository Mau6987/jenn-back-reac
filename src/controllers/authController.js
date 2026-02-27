import { Cuenta } from "../models/index.js"
import { generarToken } from "../utils/jwt.js"

export const login = async (req, res) => {
  try {
    const { usuario, contraseña } = req.body

    const cuenta = await Cuenta.findOne({
      where: { usuario, activo: true },
    })

    if (!cuenta || !(await cuenta.verificarContrasena(contraseña))) {
      return res.status(401).json({
        success: false,
        message: "Credenciales inválidas",
      })
    }

    const token = generarToken({ id: cuenta.id, rol: cuenta.rol })

    // Guardar token en la base de datos
    await cuenta.update({ token })

    res.json({
      success: true,
      message: "Inicio de sesión exitoso",
      data: {
        id: cuenta.id,
        rol: cuenta.rol,
        nombre: cuenta.nombre,
        token, // ya generado
      },
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: error.message,
    })
  }
}


export const logout = async (req, res) => {
  try {
    await req.usuario.update({ token: null })

    res.json({
      success: true,
      message: "Sesión cerrada exitosamente",
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: error.message,
    })
  }
}
