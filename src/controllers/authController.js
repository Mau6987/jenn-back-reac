import { Cuenta, Jugador, Entrenador, Tecnico } from "../models/index.js"
import { generarToken } from "../utils/jwt.js"

export const login = async (req, res) => {
  try {
    const { usuario, contraseña } = req.body

    const cuenta = await Cuenta.findOne({
      where: { usuario, activo: true },
      include: [
        { model: Jugador, as: "jugador" },
        { model: Entrenador, as: "entrenador" },
        { model: Tecnico, as: "tecnico" },
      ],
    })

    if (!cuenta || !(await cuenta.verificarContrasena(contraseña))) {
      return res.status(401).json({
        success: false,
        message: "Credenciales inválidas",
      })
    }

    const token = generarToken({ id: cuenta.id, rol: cuenta.rol })
    await cuenta.update({ token })

    const persona = cuenta.jugador || cuenta.entrenador || cuenta.tecnico

    res.json({
      success: true,
      message: "Inicio de sesión exitoso",
      data: {
        id: cuenta.id,
        rol: cuenta.rol,
        nombres: persona?.nombres ?? null,
        apellidos: persona?.apellidos ?? null,
        token,
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