import { Jugador, Cuenta } from "../models/index.js"

const calcularEdad = (fechaNacimiento) => {
  const hoy = new Date()
  const fechaNac = new Date(fechaNacimiento)
  let edad = hoy.getFullYear() - fechaNac.getFullYear()
  const mes = hoy.getMonth() - fechaNac.getMonth()
  if (mes < 0 || (mes === 0 && hoy.getDate() < fechaNac.getDate())) {
    edad--
  }
  return edad
}

const sanitizarDatosJugador = (datos) => {
  const resultado = { ...datos }

  // Campos DECIMAL — Sequelize los necesita como número, no string
  const camposDecimal = ["altura", "alcance_estatico"]
  camposDecimal.forEach((campo) => {
    if (resultado[campo] !== undefined && resultado[campo] !== "") {
      resultado[campo] = parseFloat(resultado[campo])
    } else if (resultado[campo] === "") {
      resultado[campo] = null // allowNull: true en el modelo
    }
  })

  // Campos INTEGER
  const camposInteger = ["anos_experiencia_voley"]
  camposInteger.forEach((campo) => {
    if (resultado[campo] !== undefined && resultado[campo] !== "") {
      resultado[campo] = parseInt(resultado[campo], 10)
    }
  })

  return resultado
}

export const crearJugador = async (req, res) => {
  try {
    const {
      nombres,
      apellidos,
      carrera,
      posicion_principal,
      fecha_nacimiento,
      altura,
      alcance_estatico,
      anos_experiencia_voley,
      correo_institucional,
      numero_celular,
      cuentaId,
    } = req.body

    // Validar fecha de nacimiento
    if (!fecha_nacimiento || isNaN(Date.parse(fecha_nacimiento))) {
      return res.status(400).json({
        success: false,
        message: "La fecha de nacimiento no es válida",
      })
    }

    const hoy = new Date()
    const fechaNac = new Date(fecha_nacimiento)
    if (fechaNac > hoy) {
      return res.status(400).json({
        success: false,
        message: "La fecha de nacimiento no puede ser futura",
      })
    }

    const edad = calcularEdad(fecha_nacimiento)
    if (edad < 16 || edad > 35) {
      return res.status(400).json({
        success: false,
        message: "La edad debe estar entre 16 y 35 años",
      })
    }

    const nuevoJugador = await Jugador.create({
      nombres,
      apellidos,
      carrera,
      posicion_principal,
      fecha_nacimiento,
      altura: parseFloat(altura),
      alcance_estatico: alcance_estatico !== undefined && alcance_estatico !== "" ? parseFloat(alcance_estatico) : null,
      anos_experiencia_voley: parseInt(anos_experiencia_voley, 10),
      correo_institucional,
      numero_celular,
      cuentaId,
    })

    res.status(201).json({
      success: true,
      message: "Jugador creado exitosamente",
      data: {
        ...nuevoJugador.toJSON(),
        edad,
      },
    })
  } catch (error) {
    console.error("Error al crear jugador:", error)
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: error.message,
    })
  }
}

export const obtenerJugadores = async (req, res) => {
  try {
    const jugadores = await Jugador.findAll({
      include: [
        {
          model: Cuenta,
          as: "cuenta",
          where: { activo: true },
        },
      ],
    })

    const jugadoresConEdad = jugadores.map((j) => ({
      ...j.toJSON(),
      edad: calcularEdad(j.fecha_nacimiento),
    }))

    res.json({
      success: true,
      data: jugadoresConEdad,
    })
  } catch (error) {
    console.error("Error al obtener jugadores:", error)
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: error.message,
    })
  }
}

export const obtenerJugador = async (req, res) => {
  try {
    const { id } = req.params

    const jugador = await Jugador.findOne({
      where: { id },
      include: [
        {
          model: Cuenta,
          as: "cuenta",
          where: { activo: true },
        },
      ],
    })

    if (!jugador) {
      return res.status(404).json({
        success: false,
        message: "Jugador no encontrado",
      })
    }

    if (req.usuario?.rol === "jugador" && jugador.cuentaId !== req.usuario.id) {
      return res.status(403).json({
        success: false,
        message: "No tienes permisos para ver esta información",
      })
    }

    res.json({
      success: true,
      data: {
        ...jugador.toJSON(),
        edad: calcularEdad(jugador.fecha_nacimiento),
      },
    })
  } catch (error) {
    console.error("Error al obtener jugador:", error)
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: error.message,
    })
  }
}

export const actualizarJugador = async (req, res) => {
  try {
    const { id } = req.params

    const jugador = await Jugador.findOne({
      where: { id },
      include: [
        {
          model: Cuenta,
          as: "cuenta",
          where: { activo: true },
        },
      ],
    })

    if (!jugador) {
      return res.status(404).json({
        success: false,
        message: "Jugador no encontrado",
      })
    }

    if (req.usuario?.rol === "jugador" && jugador.cuentaId !== req.usuario.id) {
      return res.status(403).json({
        success: false,
        message: "No tienes permisos para actualizar esta información",
      })
    }

    if (req.body.fecha_nacimiento) {
      if (isNaN(Date.parse(req.body.fecha_nacimiento))) {
        return res.status(400).json({
          success: false,
          message: "La fecha de nacimiento no es válida",
        })
      }
      const nuevaEdad = calcularEdad(req.body.fecha_nacimiento)
      if (nuevaEdad < 16 || nuevaEdad > 35) {
        return res.status(400).json({
          success: false,
          message: "La edad debe estar entre 16 y 35 años",
        })
      }
    }

    const datosActualizacion = sanitizarDatosJugador(req.body)

    await jugador.update(datosActualizacion)

    res.json({
      success: true,
      message: "Jugador actualizado exitosamente",
      data: {
        ...jugador.toJSON(),
        edad: calcularEdad(jugador.fecha_nacimiento),
      },
    })
  } catch (error) {
    console.error("Error al actualizar jugador:", error)
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: error.message,
    })
  }
}