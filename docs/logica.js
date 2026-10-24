/*
  logica.js
  ---------
  Funciones "puras" de la app: reciben datos y devuelven datos, sin tocar la
  pantalla (el DOM). Por eso se pueden probar en el PC con Node
  (ver tests/js/logica.test.js).

  Es un MÓDULO de JavaScript: lo que lleva "export" se puede importar desde
  otro archivo, como "from logica import barajar" en Python.
*/

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
