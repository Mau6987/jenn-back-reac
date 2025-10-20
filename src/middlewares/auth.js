import { verificarToken } from "../utils/jwt.js"
import { Cuenta } from "../models/index.js"

export const autenticar = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "")

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Token de acceso requerido",
      })
    }

    const decoded = verificarToken(token)
    const cuenta = await Cuenta.findOne({
      where: {
        id: decoded.id,
        token: token,
        activo: true,
      },
    })

    if (!cuenta) {
      return res.status(401).json({
        success: false,
        message: "Token inválido o cuenta inactiva",
      })
    }

    req.usuario = cuenta
    next()
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Token inválido",
    })
  }
}

export const autorizar = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.usuario.rol)) {
      return res.status(403).json({
        success: false,
        message: "No tienes permisos para acceder a este recurso",
      })
    }
    next()
  }
}
