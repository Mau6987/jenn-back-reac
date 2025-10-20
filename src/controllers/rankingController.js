// controllers/rankingController.js
import { Op } from "sequelize";
import { Prueba } from "../models/Prueba.js";
import { Cuenta } from "../models/Cuenta.js";
import { Jugador } from "../models/Jugador.js";
import { Entrenador } from "../models/Entrenador.js";
import { Tecnico } from "../models/Tecnico.js";

// 📌 Función auxiliar para calcular estadísticas
const calcularEstadisticas = (pruebas) => {
  return pruebas.map((prueba) => {
    const intentos = prueba.cantidad_intentos || 0;
    const aciertos = prueba.cantidad_aciertos || 0;
    const errores = prueba.cantidad_errores || 0;

    const porcentajeAcierto = intentos > 0 ? (aciertos / intentos) * 100 : 0;

    return {
      id: prueba.id,
      tipo: prueba.tipo,
      cuentaId: prueba.cuentaId,
      aciertos,
      errores,
      intentos,
      porcentajeAcierto: porcentajeAcierto.toFixed(2),
      ejercicios_realizados: prueba.ejercicios_realizados || 0,
      tiempo_inicio: prueba.tiempo_inicio,
      tiempo_fin: prueba.tiempo_fin,
      fecha: prueba.fecha, // ✅ incluir fecha
      cuenta: prueba.cuenta
        ? {
            id: prueba.cuenta.id,
            nombre: prueba.cuenta.nombre,
            jugador: prueba.cuenta.jugador || null,
            entrenador: prueba.cuenta.entrenador || null,
            tecnico: prueba.cuenta.tecnico || null,
          }
        : null,
    };
  }).sort((a, b) => b.porcentajeAcierto - a.porcentajeAcierto); // ordenar desc
};
// 📌 Ranking personal resumido (GET) por cuentaId
// 📌 Ranking personal resumido (GET) por cuentaId

// ------------------ Ranking Personal ------------------

// ------------------ Ranking Personal ------------------
export const rankingPersonal = async (req, res) => {
  try {
    const { cuentaId } = req.params;
    const { fechaInicio, fechaFin } = req.query; // opcional: filtros de fecha

    if (!cuentaId) {
      return res.status(400).json({ success: false, message: "El campo cuentaId es requerido" });
    }

    // Filtro por fechas
    const filtros = { cuentaId, estado: "finalizada" };
    if (fechaInicio && fechaFin) {
      filtros.fecha = { [Op.between]: [new Date(fechaInicio), new Date(fechaFin)] };
    }

    const pruebas = await Prueba.findAll({
      where: filtros,
      include: [
        {
          model: Cuenta,
          as: "cuenta",
          include: [
            { model: Jugador, as: "jugador" },
            { model: Entrenador, as: "entrenador" },
            { model: Tecnico, as: "tecnico" }
          ]
        }
      ]
    });

    if (pruebas.length === 0) {
      return res.json({ success: true, data: null });
    }

    // Inicializar acumuladores por tipo
    const tipos = ["secuencial", "aleatorio", "manual"];
    const resumenPorTipo = {};
    tipos.forEach(tipo => {
      resumenPorTipo[tipo] = { totalAciertos: 0, totalErrores: 0, totalIntentos: 0, porcentajePromedio: "0.00", cantidadPruebas: 0 };
    });

    let totalAciertos = 0, totalErrores = 0, totalIntentos = 0;

    // Acumular datos
    pruebas.forEach(p => {
      const tipo = p.tipo;
      const aciertos = p.cantidad_aciertos || 0;
      const errores = p.cantidad_errores || 0;
      const intentos = p.cantidad_intentos || (aciertos + errores);

      // Totales generales
      totalAciertos += aciertos;
      totalErrores += errores;
      totalIntentos += intentos;

      // Totales por tipo
      if (resumenPorTipo[tipo]) {
        resumenPorTipo[tipo].totalAciertos += aciertos;
        resumenPorTipo[tipo].totalErrores += errores;
        resumenPorTipo[tipo].totalIntentos += intentos;
        resumenPorTipo[tipo].cantidadPruebas += 1;
      }
    });

    // Calcular porcentaje promedio por tipo
    tipos.forEach(tipo => {
      const r = resumenPorTipo[tipo];
      r.porcentajePromedio = r.totalIntentos > 0 ? ((r.totalAciertos / r.totalIntentos) * 100).toFixed(2) : "0.00";
    });

    const cuenta = pruebas[0].cuenta;

    res.json({
      success: true,
      data: {
        cuentaId: cuenta.id,
        jugador: cuenta.jugador || null,
        entrenador: cuenta.entrenador || null,
        tecnico: cuenta.tecnico || null,
        totalAciertos,
        totalErrores,
        totalIntentos,
        porcentajePromedio: totalIntentos > 0 ? ((totalAciertos / totalIntentos) * 100).toFixed(2) : "0.00",
        resumenPorTipo
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, message: "Error en rankingPersonal", error: error.message });
  }
};

// ------------------ Ranking General ------------------
export const rankingGeneral = async (req, res) => {
  try {
    const { fechaInicio, fechaFin } = req.query; // opcional: filtros de fecha

    // Filtro por fechas
    const filtros = { estado: "finalizada" };
    if (fechaInicio && fechaFin) {
      filtros.fecha = { [Op.between]: [new Date(fechaInicio), new Date(fechaFin)] };
    }

    const pruebas = await Prueba.findAll({
      where: filtros,
      include: [
        {
          model: Cuenta,
          as: "cuenta",
          include: [
            { model: Jugador, as: "jugador" },
            { model: Entrenador, as: "entrenador" },
            { model: Tecnico, as: "tecnico" }
          ]
        }
      ]
    });

    if (pruebas.length === 0) return res.json({ success: true, data: null });

    const tipos = ["secuencial", "aleatorio", "manual"];

    // Agrupar por tipo de prueba y luego por jugador
    const topPorTipo = {};
    tipos.forEach(tipo => {
      const pruebasTipo = pruebas.filter(p => p.tipo === tipo);
      const jugadoresTipo = {};

      pruebasTipo.forEach(p => {
        const cuentaId = p.cuentaId;
        if (!jugadoresTipo[cuentaId]) {
          jugadoresTipo[cuentaId] = {
            cuenta: p.cuenta,
            totalAciertos: 0,
            totalErrores: 0,
            totalIntentos: 0,
            cantidadPruebas: 0
          };
        }
        const aciertos = p.cantidad_aciertos || 0;
        const errores = p.cantidad_errores || 0;
        const intentos = p.cantidad_intentos || (aciertos + errores);

        jugadoresTipo[cuentaId].totalAciertos += aciertos;
        jugadoresTipo[cuentaId].totalErrores += errores;
        jugadoresTipo[cuentaId].totalIntentos += intentos;
        jugadoresTipo[cuentaId].cantidadPruebas += 1;
      });

      // Calcular porcentaje promedio
      Object.values(jugadoresTipo).forEach(j => {
        j.porcentajePromedio = j.totalIntentos > 0 ? ((j.totalAciertos / j.totalIntentos) * 100).toFixed(2) : "0.00";
      });

      // Top 3 por aciertos en este tipo
      topPorTipo[tipo] = Object.values(jugadoresTipo)
        .sort((a, b) => b.totalAciertos - a.totalAciertos)
        .slice(0, 3);
    });

    // Top general (todos los tipos juntos)
    const jugadoresGeneral = {};
    pruebas.forEach(p => {
      const cuentaId = p.cuentaId;
      if (!jugadoresGeneral[cuentaId]) {
        jugadoresGeneral[cuentaId] = {
          cuenta: p.cuenta,
          totalAciertos: 0,
          totalErrores: 0,
          totalIntentos: 0
        };
      }
      const aciertos = p.cantidad_aciertos || 0;
      const errores = p.cantidad_errores || 0;
      const intentos = p.cantidad_intentos || (aciertos + errores);

      jugadoresGeneral[cuentaId].totalAciertos += aciertos;
      jugadoresGeneral[cuentaId].totalErrores += errores;
      jugadoresGeneral[cuentaId].totalIntentos += intentos;
    });

    Object.values(jugadoresGeneral).forEach(j => {
      j.porcentajePromedio = j.totalIntentos > 0 ? ((j.totalAciertos / j.totalIntentos) * 100).toFixed(2) : "0.00";
    });

    const topGeneral = Object.values(jugadoresGeneral)
      .sort((a, b) => b.totalAciertos - a.totalAciertos)
      .slice(0, 3);

    res.json({
      success: true,
      data: {
        topPorTipo,
        topGeneral
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, message: "Error en rankingGeneral", error: error.message });
  }
};
// 📌 Ranking personal filtrado por POST
export const rankingPersonalFiltrado = async (req, res) => {
  try {
    const { cuentaId, fechaInicio, fechaFin, tipos } = req.body;

    if (!cuentaId) {
      return res.status(400).json({ success: false, message: "El campo cuentaId es requerido" });
    }

    const tiposFiltro = tipos && Array.isArray(tipos) && tipos.length > 0
      ? tipos
      : ["secuencial", "aleatorio", "manual"];

    // Filtro base
    const filtros = {
      cuentaId,
      estado: "finalizada",
      tipo: { [Op.in]: tiposFiltro }
    };

    // Ajuste de fechas: si vienen, convertir a rango completo del día
    if (fechaInicio && fechaFin) {
      const inicio = new Date(fechaInicio);
      inicio.setHours(0, 0, 0, 0);

      const fin = new Date(fechaFin);
      fin.setHours(23, 59, 59, 999);

      filtros.fecha = { [Op.between]: [inicio, fin] };
    }

    const pruebas = await Prueba.findAll({
      where: filtros,
      include: [
        {
          model: Cuenta,
          as: "cuenta",
          include: [
            { model: Jugador, as: "jugador" },
            { model: Entrenador, as: "entrenador" },
            { model: Tecnico, as: "tecnico" }
          ]
        }
      ]
    });

    if (pruebas.length === 0) {
      return res.json({ success: true, data: null });
    }

    // Agrupar por tipo de prueba
    const resumenPorTipo = {};
    tiposFiltro.forEach(tipo => {
      const pruebasTipo = pruebas.filter(p => p.tipo === tipo);
      if (pruebasTipo.length === 0) return;

      let totalAciertos = 0;
      let totalErrores = 0;
      let totalIntentos = 0;

      pruebasTipo.forEach(p => {
        const aciertos = p.cantidad_aciertos || 0;
        const errores = p.cantidad_errores || 0;
        const intentos = p.cantidad_intentos || (aciertos + errores);

        totalAciertos += aciertos;
        totalErrores += errores;
        totalIntentos += intentos;
      });

      resumenPorTipo[tipo] = {
        tipo,
        cuenta: pruebasTipo[0].cuenta,
        totalAciertos,
        totalErrores,
        totalIntentos,
        porcentajePromedio: totalIntentos > 0 ? ((totalAciertos / totalIntentos) * 100).toFixed(2) : "0.00",
        cantidadPruebas: pruebasTipo.length
      };
    });

    res.json({ success: true, data: resumenPorTipo });

  } catch (error) {
    res.status(500).json({ success: false, message: "Error en rankingPersonalFiltrado", error: error.message });
  }
};


// 📌 Ranking general con filtros
export const rankingGeneralFiltrado = async (req, res) => {
  try {
    const { fechaInicio, fechaFin, tipo, top } = req.body;

    const filtros = { estado: "finalizada" };

    if (fechaInicio && fechaFin) {
      filtros.fecha = { [Op.between]: [new Date(fechaInicio), new Date(fechaFin)] }; // ✅ usar fecha
    } else {
      const defFin = new Date();
      const defInicio = new Date();
      defInicio.setMonth(defInicio.getMonth() - 1);
      filtros.fecha = { [Op.between]: [defInicio, defFin] }; // ✅ usar fecha
    }

    if (tipo) filtros.tipo = tipo;

    const pruebas = await Prueba.findAll({
      where: filtros,
      include: [
        {
          model: Cuenta,
          as: "cuenta",
          include: [
            { model: Jugador, as: "jugador" },
            { model: Entrenador, as: "entrenador" },
            { model: Tecnico, as: "tecnico" },
          ],
        },
      ],
    });

    let resultados = calcularEstadisticas(pruebas);
    if (top) resultados = resultados.slice(0, top);

    res.json({ success: true, data: resultados });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error en rankingGeneralFiltrado", error: error.message });
  }
};
