import { body, param, validationResult } from "express-validator"

export const manejarErroresValidacion = (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Errores de validación",
      errors: errors.array(),
    })
  }
  next()
}

export const validarLogin = [
  body("usuario").isLength({ min: 3, max: 50 }).withMessage("El usuario debe tener entre 3 y 50 caracteres"),
  body("contraseña").isLength({ min: 6 }).withMessage("La contraseña debe tener al menos 6 caracteres"),
  manejarErroresValidacion,
]

export const validarCuenta = [
  body("usuario").isLength({ min: 3, max: 50 }).withMessage("El usuario debe tener entre 3 y 50 caracteres"),
  body("contraseña").isLength({ min: 6 }).withMessage("La contraseña debe tener al menos 6 caracteres"),
  body("rol").isIn(["jugador", "entrenador", "tecnico"]).withMessage("El rol debe ser: jugador, entrenador o tecnico"),
  manejarErroresValidacion,
]

export const validarJugador = [
  body("nombres").isLength({ min: 2, max: 100 }).withMessage("Los nombres deben tener entre 2 y 100 caracteres"),
  body("apellidos").isLength({ min: 2, max: 100 }).withMessage("Los apellidos deben tener entre 2 y 100 caracteres"),
  body("carrera").isLength({ min: 2, max: 100 }).withMessage("La carrera debe tener entre 2 y 100 caracteres"),
  body("posicion_principal")
    .isIn(["armador", "opuesto", "central", "receptor", "libero"])
    .withMessage("Posición inválida"),
  body("fecha_nacimiento").isISO8601().withMessage("La fecha de nacimiento debe ser válida (YYYY-MM-DD)"),
  body("altura").isFloat({ min: 1.5, max: 2.2 }).withMessage("La altura debe estar entre 1.5 y 2.2 metros"),
  body("anos_experiencia_voley")
    .isInt({ min: 0, max: 20 })
    .withMessage("Los años de experiencia deben estar entre 0 y 20"),
  body("correo_institucional").isEmail().withMessage("Debe ser un email válido"),
  body("numero_celular")
    .isLength({ min: 8, max: 15 })
    .isNumeric()
    .withMessage("El número celular debe tener entre 8 y 15 dígitos"),
  manejarErroresValidacion,
]

export const validarEntrenador = [
  body("nombres").isLength({ min: 2, max: 100 }).withMessage("Los nombres deben tener entre 2 y 100 caracteres"),
  body("apellidos").isLength({ min: 2, max: 100 }).withMessage("Los apellidos deben tener entre 2 y 100 caracteres"),
  body("fecha_nacimiento").isISO8601().withMessage("La fecha de nacimiento debe ser válida (YYYY-MM-DD)"),
  body("anos_experiencia_voley")
    .isInt({ min: 1, max: 40 })
    .withMessage("Los años de experiencia deben estar entre 1 y 40"),
  body("numero_celular")
    .isLength({ min: 8, max: 15 })
    .isNumeric()
    .withMessage("El número celular debe tener entre 8 y 15 dígitos"),
  body("correo_electronico").isEmail().withMessage("Debe ser un email válido"),
  manejarErroresValidacion,
]

export const validarTecnico = [
  body("nombres").isLength({ min: 2, max: 100 }).withMessage("Los nombres deben tener entre 2 y 100 caracteres"),
  body("apellidos").isLength({ min: 2, max: 100 }).withMessage("Los apellidos deben tener entre 2 y 100 caracteres"),
  body("fecha_nacimiento").isISO8601().withMessage("La fecha de nacimiento debe ser válida (YYYY-MM-DD)"),
  body("correo_institucional").isEmail().withMessage("Debe ser un email válido"),
  body("numero_celular")
    .isLength({ min: 8, max: 15 })
    .isNumeric()
    .withMessage("El número celular debe tener entre 8 y 15 dígitos"),
  manejarErroresValidacion,
]

export const validarId = [
  param("id").isInt({ min: 1 }).withMessage("El ID debe ser un número entero positivo"),
  manejarErroresValidacion,
]
