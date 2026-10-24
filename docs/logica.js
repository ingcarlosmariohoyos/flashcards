/*
  logica.js
  ---------
  Funciones "puras" de la app: reciben datos y devuelven datos, sin tocar la
  pantalla (el DOM) ni el almacenamiento. Por eso se pueden probar en el PC con
  Node (ver tests/js/logica.test.js).

  Es un MÓDULO de JavaScript: lo que lleva "export" se puede importar desde
  otro archivo, como "from logica import barajar" en Python.

  Contenido:
    1. Utilidades del mazo (barajar, validarMazo).
    2. Fechas (texto "AAAA-MM-DD").
    3. Repetición espaciada con el sistema Leitner.
    4. Validación del progreso guardado o importado desde un respaldo.
*/

// =====================================================================
// 1. Utilidades del mazo
// =====================================================================

/** Campos de texto obligatorios en cada tarjeta de deck.json. */
export const CAMPOS_TARJETA = ["palabra", "significado", "oracion_ejemplo", "emoji"];

/** Devuelve una copia barajada de la lista (algoritmo Fisher-Yates, como random.shuffle). */
export function barajar(lista) {
  const copia = [...lista]; // [...lista] = copia superficial, como lista[:] en Python
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]]; // intercambio, como a, b = b, a
  }
  return copia;
}

/**
 * Revisa que deck.json tenga el formato esperado y devuelve solo las tarjetas válidas.
 * Es como validar un esquema en Python (ej. con pydantic) antes de usar los datos.
 * Lanza un error si el archivo no sirve en absoluto.
 */
export function validarMazo(datos) {
  if (!Array.isArray(datos)) {
    throw new Error("deck.json no contiene una lista de tarjetas");
  }

  // filter = como una list comprehension con "if": se queda con las tarjetas que cumplen.
  const validas = datos.filter(
    (t) =>
      t !== null &&
      typeof t === "object" &&
      // every = como all() de Python: todos los campos deben ser texto no vacío.
      CAMPOS_TARJETA.every((campo) => typeof t[campo] === "string" && t[campo].trim() !== "")
  );

  if (validas.length < datos.length) {
    // console.warn escribe en la consola del navegador (F12), como logging.warning.
    console.warn(`Se ignoraron ${datos.length - validas.length} tarjeta(s) mal formadas.`);
  }
  if (validas.length === 0) {
    throw new Error("deck.json no tiene tarjetas válidas");
  }
  return validas;
}

// =====================================================================
// 2. Fechas
// =====================================================================
// Guardamos las fechas como texto "AAAA-MM-DD" (sin hora). Ventajas:
//   - Se leen fácil en el respaldo JSON.
//   - Se comparan como texto: "2026-10-23" < "2026-11-02" funciona igual que con fechas.
//   - Evitamos líos de zonas horarias: "hoy" es el día según el reloj del teléfono.

/** Convierte un objeto Date en texto "AAAA-MM-DD" (fecha local del teléfono). */
export function fechaISO(fecha) {
  const anio = fecha.getFullYear();
  // getMonth() empieza en 0 (enero = 0). padStart rellena con ceros: "7" -> "07".
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");
  return `${anio}-${mes}-${dia}`;
}

/** Suma (o resta) días a una fecha en texto: sumarDias("2026-10-31", 1) -> "2026-11-01". */
export function sumarDias(fechaTexto, dias) {
  // map(Number) convierte ["2026", "10", "31"] en [2026, 10, 31], como map(int, ...) en Python.
  const [anio, mes, dia] = fechaTexto.split("-").map(Number);
  // Date se encarga de los cambios de mes/año y de los bisiestos.
  // Usamos las 12:00 para que un cambio de horario nunca nos mueva de día.
  return fechaISO(new Date(anio, mes - 1, dia + dias, 12));
}

// =====================================================================
// 3. Sistema Leitner
// =====================================================================
// Cada palabra vive en una "caja" (1 a 5). Cuanto más alta la caja, más días
// pasan antes de volver a repasarla:
//   - "facil"    -> sube una caja (máximo 5).
//   - "dificil"  -> se queda en su caja.
//   - "no_sabia" -> vuelve a la caja 1.
//
// El progreso se guarda como un diccionario { clave_palabra: estado }:
//   {
//     version: 1,                         // para poder migrar a SM-2 en el futuro
//     tarjetas: { "hello": { caja: 2, proximo: "2026-10-25", repasos: 3 } },
//     nuevasHoy: { fecha: "2026-10-23", cantidad: 4 }   // palabras nuevas vistas hoy
//   }

/** Días hasta el próximo repaso según la caja: caja 1 -> 1 día, ..., caja 5 -> 16 días. */
export const INTERVALOS_DIAS = [1, 2, 4, 8, 16];
export const CAJA_MAXIMA = INTERVALOS_DIAS.length;
export const NUEVAS_POR_DIA = 10;
export const VERSION_PROGRESO = 1;

/**
 * Identificador de una tarjeta dentro del progreso: la palabra en minúsculas.
 * NO usamos el "id" porque sale del orden del CSV: si insertas o borras una fila,
 * todos los ids se corren y el progreso quedaría asignado a otras palabras.
 */
export function claveTarjeta(tarjeta) {
  return tarjeta.palabra.trim().toLowerCase();
}

/** Progreso inicial (nadie ha estudiado nada todavía). */
export function progresoVacio() {
  return { version: VERSION_PROGRESO, tarjetas: {}, nuevasHoy: { fecha: "", cantidad: 0 } };
}

/**
 * Devuelve el estado guardado de una palabra, o undefined si es nueva.
 * Object.hasOwn evita una trampa de JS: todo objeto "hereda" claves como
 * "constructor" o "toString", así que tarjetas["constructor"] NO sería undefined
 * aunque nunca la hayas estudiado. (Es como si un dict de Python trajera claves ocultas.)
 */
export function estadoDe(progreso, clave) {
  return Object.hasOwn(progreso.tarjetas, clave) ? progreso.tarjetas[clave] : undefined;
}

/**
 * Calcula el nuevo estado de una tarjeta después de calificarla.
 * "estado" es undefined si la palabra es nueva (se trata como caja 1).
 * "hoy" es texto "AAAA-MM-DD"; se recibe como parámetro para poder probarla.
 */
export function calificarTarjeta(estado, calificacion, hoy) {
  const cajaActual = estado ? estado.caja : 1;

  let caja;
  if (calificacion === "facil") {
    caja = Math.min(cajaActual + 1, CAJA_MAXIMA);
  } else if (calificacion === "dificil") {
    caja = cajaActual;
  } else if (calificacion === "no_sabia") {
    caja = 1;
  } else {
    throw new Error(`Calificación desconocida: ${calificacion}`);
  }

  return {
    caja,
    proximo: sumarDias(hoy, INTERVALOS_DIAS[caja - 1]),
    repasos: (estado ? estado.repasos : 0) + 1,
  };
}

/** Cuántas palabras nuevas se estudiaron ya en el día "hoy". */
export function nuevasVistasHoy(progreso, hoy) {
  return progreso.nuevasHoy.fecha === hoy ? progreso.nuevasHoy.cantidad : 0;
}

/**
 * Decide qué tarjetas tocan hoy:
 *   - pendientes: ya estudiadas y cuya fecha de repaso llegó (o pasó).
 *   - nuevas: nunca estudiadas, en el orden del CSV, sin pasar el límite diario.
 * Las palabras del deck que no están en el progreso son "nuevas"; así, cuando
 * agregas palabras al CSV, entran solas sin afectar el progreso de las demás.
 */
export function tarjetasDeHoy(mazo, progreso, hoy, limiteNuevas = NUEVAS_POR_DIA) {
  const pendientes = [];
  const nuevas = [];
  const cupoNuevas = Math.max(0, limiteNuevas - nuevasVistasHoy(progreso, hoy));

  for (const tarjeta of mazo) {
    const estado = estadoDe(progreso, claveTarjeta(tarjeta));
    if (estado === undefined) {
      if (nuevas.length < cupoNuevas) nuevas.push(tarjeta);
    } else if (estado.proximo <= hoy) {
      pendientes.push(tarjeta);
    }
  }
  return { pendientes, nuevas };
}

/**
 * Registra la calificación de una tarjeta y devuelve un progreso NUEVO
 * (no modifica el original, igual que una función pura en Python que devuelve
 * una copia en vez de mutar el dict que recibe).
 */
export function registrarRespuesta(progreso, tarjeta, calificacion, hoy) {
  const clave = claveTarjeta(tarjeta);
  const estado = estadoDe(progreso, clave);
  const esNueva = estado === undefined;

  return {
    ...progreso, // "..." copia todas las claves, como {**progreso} en Python
    // [clave]: valor = clave calculada, como {**tarjetas, clave: valor} en Python.
    tarjetas: { ...progreso.tarjetas, [clave]: calificarTarjeta(estado, calificacion, hoy) },
    nuevasHoy: esNueva
      ? { fecha: hoy, cantidad: nuevasVistasHoy(progreso, hoy) + 1 }
      : progreso.nuevasHoy,
  };
}

// =====================================================================
// 4. Validación del progreso (al cargarlo del teléfono o importar un respaldo)
// =====================================================================

const FORMATO_FECHA = /^\d{4}-\d{2}-\d{2}$/; // expresión regular, como re.compile(...) en Python

/** ¿Es un objeto "normal" (diccionario), y no null ni una lista? */
function esObjeto(valor) {
  return valor !== null && typeof valor === "object" && !Array.isArray(valor);
}

/**
 * Revisa un progreso (por ejemplo, un respaldo importado) y devuelve una copia limpia.
 * Lanza un error si el formato general no sirve; descarta en silencio las entradas
 * de palabras que estén mal formadas.
 */
export function validarProgreso(datos) {
  if (!esObjeto(datos)) {
    throw new Error("el archivo no tiene el formato de un respaldo");
  }
  if (datos.version !== VERSION_PROGRESO) {
    throw new Error(`versión de respaldo no soportada (${datos.version})`);
  }
  if (!esObjeto(datos.tarjetas)) {
    throw new Error("el respaldo no contiene el progreso de las tarjetas");
  }

  const tarjetas = {};
  // Object.entries = dict.items() de Python.
  for (const [clave, estado] of Object.entries(datos.tarjetas)) {
    const valido =
      clave !== "__proto__" && // clave especial de JS que podría alterar el objeto
      esObjeto(estado) &&
      Number.isInteger(estado.caja) &&
      estado.caja >= 1 &&
      estado.caja <= CAJA_MAXIMA &&
      typeof estado.proximo === "string" &&
      FORMATO_FECHA.test(estado.proximo);

    if (valido) {
      tarjetas[clave] = {
        caja: estado.caja,
        proximo: estado.proximo,
        repasos: Number.isInteger(estado.repasos) && estado.repasos >= 0 ? estado.repasos : 0,
      };
    }
  }

  const n = datos.nuevasHoy;
  const nuevasHoyValido =
    esObjeto(n) &&
    typeof n.fecha === "string" &&
    Number.isInteger(n.cantidad) &&
    n.cantidad >= 0;

  return {
    version: VERSION_PROGRESO,
    tarjetas,
    nuevasHoy: nuevasHoyValido ? { fecha: n.fecha, cantidad: n.cantidad } : { fecha: "", cantidad: 0 },
  };
}
