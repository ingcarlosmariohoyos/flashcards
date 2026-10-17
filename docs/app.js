/*
  app.js
  ------
  Lógica de la app (Viernes 2, versión básica):
    1. Descarga deck.json.
    2. Baraja las tarjetas y muestra la primera.
    3. Al tocar la tarjeta, la voltea y habilita los botones.
    4. Al calificar, cuenta la respuesta y pasa a la siguiente.
    5. Al terminar, muestra un resumen.

  Todavía NO se guarda progreso: eso llega el Viernes 3 (Leitner + almacenamiento).
*/

// "use strict" hace que JS marque como error algunos descuidos (ej. variables sin declarar).
"use strict";

// ===== Referencias a elementos del HTML =====
// document.getElementById busca en la página el elemento con ese id.
const elTarjeta = document.getElementById("tarjeta");
const elEmoji = document.getElementById("emoji");
const elPalabra = document.getElementById("palabra");
const elSignificado = document.getElementById("significado");
const elEjemplo = document.getElementById("ejemplo");
const elContador = document.getElementById("contador");
const elVistaRepaso = document.getElementById("vista-repaso");
const elVistaFin = document.getElementById("vista-fin");
const elError = document.getElementById("error");
// querySelectorAll usa un selector CSS: todos los botones que tengan data-calificacion.
const botonesCalificar = document.querySelectorAll("[data-calificacion]");

// ===== Estado de la sesión =====
// Como variables globales de un script de Python: describen "dónde vamos".
let mazo = [];          // todas las tarjetas leídas de deck.json
let sesion = [];        // tarjetas de esta sesión, en orden aleatorio
let indice = 0;         // posición de la tarjeta actual dentro de "sesion"
let volteada = false;   // ¿la tarjeta actual muestra la cara de atrás?
let totales = { facil: 0, dificil: 0, no_sabia: 0 };

// ===== Utilidades =====

/** Devuelve una copia barajada de la lista (algoritmo Fisher-Yates, como random.shuffle). */
function barajar(lista) {
  const copia = [...lista]; // [...lista] = copia superficial, como lista[:] en Python
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]]; // intercambio, como a, b = b, a
  }
  return copia;
}

/** Habilita o deshabilita los tres botones de calificación. */
function habilitarBotones(habilitar) {
  botonesCalificar.forEach((boton) => {
    boton.disabled = !habilitar;
  });
}

// ===== Lógica principal =====

/** Empieza (o reinicia) una sesión con todas las tarjetas barajadas. */
function iniciarSesion() {
  sesion = barajar(mazo);
  indice = 0;
  totales = { facil: 0, dificil: 0, no_sabia: 0 };
  elVistaFin.hidden = true;
  elVistaRepaso.hidden = false;
  mostrarTarjeta();
}

/** Muestra la tarjeta actual por el frente. */
function mostrarTarjeta() {
  const tarjeta = sesion[indice];

  // Cambiar textContent modifica lo que se ve en pantalla (el DOM).
  elEmoji.textContent = tarjeta.emoji;
  elPalabra.textContent = tarjeta.palabra;
  elSignificado.textContent = tarjeta.significado;
  elEjemplo.textContent = tarjeta.oracion_ejemplo;
  // Plantilla de texto con `${...}`: equivale a un f-string de Python.
  elContador.textContent = `${indice + 1} / ${sesion.length}`;

  volteada = false;
  elTarjeta.classList.remove("volteada"); // el CSS gira la tarjeta según esta clase
  habilitarBotones(false);
}

/** Voltea la tarjeta (frente <-> atrás). */
function voltear() {
  volteada = !volteada;
  elTarjeta.classList.toggle("volteada", volteada);
  // Solo se puede calificar después de ver la respuesta.
  if (volteada) habilitarBotones(true);
}

/** Registra la calificación y avanza a la siguiente tarjeta. */
function calificar(calificacion) {
  totales[calificacion] += 1;
  indice += 1;

  if (indice < sesion.length) {
    mostrarTarjeta();
  } else {
    terminarSesion();
  }
}

/** Oculta la tarjeta y muestra el resumen de la sesión. */
function terminarSesion() {
  document.getElementById("total-facil").textContent = totales.facil;
  document.getElementById("total-dificil").textContent = totales.dificil;
  document.getElementById("total-no-sabia").textContent = totales.no_sabia;
  elContador.textContent = "¡Listo!";
  elVistaRepaso.hidden = true;
  elVistaFin.hidden = false;
}

/** Descarga deck.json. "async" + "await" funcionan como en asyncio de Python. */
async function cargarMazo() {
  try {
    // cache: "no-cache" = pregunta siempre al servidor si hay una versión nueva.
    const respuesta = await fetch("deck.json", { cache: "no-cache" });
    if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);
    mazo = await respuesta.json(); // convierte el texto JSON en una lista de objetos
    iniciarSesion();
  } catch (err) {
    elContador.textContent = "";
    elVistaRepaso.hidden = true;
    elError.hidden = false;
    elError.textContent = `No se pudieron cargar las tarjetas (${err.message}).`;
  }
}

// ===== Eventos =====
// addEventListener("click", funcion) = "cuando pase X, ejecuta esta función".
elTarjeta.addEventListener("click", voltear);

// Teclado (útil para probar en el PC): Espacio/Enter voltea la tarjeta.
elTarjeta.addEventListener("keydown", (evento) => {
  if (evento.key === " " || evento.key === "Enter") {
    evento.preventDefault(); // evita que la página haga scroll con Espacio
    voltear();
  }
});

botonesCalificar.forEach((boton) => {
  // boton.dataset.calificacion lee el atributo data-calificacion del HTML.
  boton.addEventListener("click", () => calificar(boton.dataset.calificacion));
});

document.getElementById("btn-reiniciar").addEventListener("click", iniciarSesion);

// ¡Arranque!
cargarMazo();
