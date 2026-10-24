/*
  app.js
  ------
  Pantalla de la app (Viernes 3):
    1. Registra el service worker (sw.js) para que la app funcione sin internet.
    2. Descarga deck.json y carga el progreso guardado en el teléfono (localStorage).
    3. Arma la sesión de hoy: tarjetas pendientes (Leitner) + hasta 10 nuevas.
    4. Al calificar, actualiza la caja de la tarjeta y guarda el progreso al instante.
    5. Al terminar, muestra un resumen y los botones de respaldo (exportar/importar).

  La lógica pura (Leitner, validaciones) vive en logica.js y tiene pruebas en tests/js/.
*/

// Este archivo es un módulo (ver <script type="module"> en index.html):
// los módulos ya trabajan en "modo estricto", que marca como error algunos
// descuidos (ej. variables sin declarar).

// Importa las funciones puras desde logica.js (como "from logica import ..." en Python).
import {
  barajar,
  validarMazo,
  fechaISO,
  sumarDias,
  progresoVacio,
  tarjetasDeHoy,
  registrarRespuesta,
  validarProgreso,
  revisarTamanoRespaldo,
} from "./logica.js";

// Nombre con el que se guarda el progreso en el teléfono.
const CLAVE_PROGRESO = "flashcards.progreso";

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
const elTituloFin = document.getElementById("titulo-fin");
const elListaTotales = document.getElementById("lista-totales");
const elMensajeFin = document.getElementById("mensaje-fin");
const elInputRespaldo = document.getElementById("input-respaldo");
const elError = document.getElementById("error");
// querySelectorAll usa un selector CSS: todos los botones que tengan data-calificacion.
const botonesCalificar = document.querySelectorAll("[data-calificacion]");

// ===== Estado de la app =====
let mazo = [];                  // todas las tarjetas leídas de deck.json
let progreso = progresoVacio(); // cajas y fechas de repaso de cada palabra
// Tarjetas de esta sesión. Cada elemento es { tarjeta, repeticion }:
// "repeticion" = true si es una tarjeta que ya fallaste hoy y vuelve al final.
let sesion = [];
let indice = 0;                 // posición de la tarjeta actual dentro de "sesion"
let volteada = false;           // ¿la tarjeta actual muestra la cara de atrás?
let totales = { facil: 0, dificil: 0, no_sabia: 0 };
let avisoErrorGuardado = false; // para no repetir la alerta si falla el guardado

// ===== Utilidades =====

/** Fecha de hoy según el teléfono, como texto "AAAA-MM-DD". */
function hoy() {
  return fechaISO(new Date());
}

/** Habilita o deshabilita los tres botones de calificación. */
function habilitarBotones(habilitar) {
  botonesCalificar.forEach((boton) => {
    boton.disabled = !habilitar;
  });
}

// ===== Progreso: guardar y cargar en el teléfono =====
// localStorage es un "diccionario" del navegador que guarda texto y sobrevive
// aunque cierres la app (como un archivo .json pequeño por sitio web).
// Por eso convertimos el progreso a texto con JSON.stringify (≈ json.dumps)
// y lo leemos con JSON.parse (≈ json.loads).

/** Lee el progreso guardado; si no hay o está dañado, empieza de cero. */
function cargarProgreso() {
  const texto = localStorage.getItem(CLAVE_PROGRESO);
  if (texto === null) return progresoVacio(); // primera vez que se usa la app

  try {
    return validarProgreso(JSON.parse(texto));
  } catch (err) {
    // No borramos lo dañado: lo apartamos con otro nombre por si se puede rescatar.
    console.error("Progreso dañado, se empieza de cero:", err);
    localStorage.setItem(`${CLAVE_PROGRESO}.danado`, texto);
    return progresoVacio();
  }
}

/** Guarda el progreso actual en el teléfono. */
function guardarProgreso() {
  try {
    localStorage.setItem(CLAVE_PROGRESO, JSON.stringify(progreso));
  } catch (err) {
    console.error("No se pudo guardar el progreso:", err);
    if (!avisoErrorGuardado) {
      avisoErrorGuardado = true;
      alert("⚠️ No se pudo guardar tu progreso en este teléfono.");
    }
  }
}

// ===== Lógica de la sesión =====

/** Arma la sesión de hoy con las tarjetas pendientes y las nuevas. */
function iniciarSesion() {
  const { pendientes, nuevas } = tarjetasDeHoy(mazo, progreso, hoy());

  // map transforma cada tarjeta en { tarjeta, repeticion }, como una list comprehension.
  sesion = barajar([...pendientes, ...nuevas]).map((tarjeta) => ({ tarjeta, repeticion: false }));
  indice = 0;
  totales = { facil: 0, dificil: 0, no_sabia: 0 };

  if (sesion.length === 0) {
    mostrarFin(false); // no hay nada que repasar hoy
    return;
  }
  elVistaFin.hidden = true;
  elVistaRepaso.hidden = false;
  mostrarTarjeta();
}

/** Muestra la tarjeta actual por el frente. */
function mostrarTarjeta() {
  const { tarjeta } = sesion[indice]; // "desempaqueta" la clave tarjeta del objeto

  // Cambiar textContent modifica lo que se ve en pantalla (el DOM).
  elEmoji.textContent = tarjeta.emoji;
  elPalabra.textContent = tarjeta.palabra;
  elSignificado.textContent = tarjeta.significado;
  elEjemplo.textContent = tarjeta.oracion_ejemplo;
  elContador.textContent = `Pendientes: ${sesion.length - indice}`;

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

/** Registra la calificación, guarda el progreso y avanza a la siguiente tarjeta. */
function calificar(calificacion) {
  const actual = sesion[indice];

  // Solo la PRIMERA respuesta del día cuenta para Leitner. Las repeticiones de
  // tarjetas falladas son práctica extra: no cambian su caja.
  if (!actual.repeticion) {
    totales[calificacion] += 1;
    progreso = registrarRespuesta(progreso, actual.tarjeta, calificacion, hoy());
    guardarProgreso(); // se guarda al instante: si cierras la app a mitad, no pierdes nada
  }

  // Si no la sabías, vuelve al final de la sesión de hoy (hasta que la aciertes).
  if (calificacion === "no_sabia") {
    sesion.push({ tarjeta: actual.tarjeta, repeticion: true });
  }

  indice += 1;
  if (indice < sesion.length) {
    mostrarTarjeta();
  } else {
    mostrarFin(true);
  }
}

/** Muestra la vista final. "huboSesion" = false si no había nada que repasar. */
function mostrarFin(huboSesion) {
  elTituloFin.textContent = huboSesion ? "¡Sesión terminada!" : "¡Estás al día!";
  elListaTotales.hidden = !huboSesion;
  document.getElementById("total-facil").textContent = totales.facil;
  document.getElementById("total-dificil").textContent = totales.dificil;
  document.getElementById("total-no-sabia").textContent = totales.no_sabia;

  // ¿Cuántas tarjetas tocarán mañana? Usamos la misma función, con la fecha de mañana.
  const { pendientes, nuevas } = tarjetasDeHoy(mazo, progreso, sumarDias(hoy(), 1));
  const manana = pendientes.length + nuevas.length;
  elMensajeFin.textContent =
    manana > 0 ? `Mañana te esperan ${manana} tarjeta(s).` : "Mañana no tienes repasos 😎";

  elContador.textContent = "¡Listo!";
  elVistaRepaso.hidden = true;
  elVistaFin.hidden = false;
}

// ===== Respaldo: exportar e importar el progreso =====

/** Guarda el progreso en un archivo JSON (en el iPhone abre el menú "Compartir"). */
async function exportarRespaldo() {
  const nombre = `flashcards-respaldo-${hoy()}.json`;
  // File = un archivo creado en memoria, a partir de texto.
  const archivo = new File([JSON.stringify(progreso, null, 2)], nombre, {
    type: "application/json",
  });

  // En el iPhone, navigator.share abre el menú del sistema: "Guardar en Archivos",
  // AirDrop, WhatsApp, correo...
  if (navigator.canShare && navigator.canShare({ files: [archivo] })) {
    try {
      await navigator.share({ files: [archivo], title: "Respaldo de Flashcards" });
    } catch (err) {
      // AbortError = cerraste el menú sin elegir nada: no es un error real.
      if (err.name !== "AbortError") alert(`No se pudo compartir: ${err.message}`);
    }
    return;
  }

  // En el PC: descarga normal, creando un enlace temporal y "haciéndole clic".
  const url = URL.createObjectURL(archivo);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombre;
  enlace.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000); // libera la memoria del archivo
}

/** Lee un respaldo elegido por el usuario y reemplaza el progreso actual. */
async function importarRespaldo() {
  const archivo = elInputRespaldo.files[0];
  if (!archivo) return; // cancelaste el selector

  try {
    revisarTamanoRespaldo(archivo.size); // archivo.size = tamaño en bytes, sin leerlo todavía
    const datos = validarProgreso(JSON.parse(await archivo.text()));
    const cantidad = Object.keys(datos.tarjetas).length;
    // confirm muestra un diálogo "Aceptar / Cancelar" y devuelve true o false.
    const seguro = confirm(
      `El respaldo tiene progreso de ${cantidad} palabra(s).\n` +
        "Esto REEMPLAZA tu progreso actual. ¿Continuar?"
    );
    if (!seguro) return;

    progreso = datos;
    guardarProgreso();
    alert("✅ Respaldo importado.");
    iniciarSesion();
  } catch (err) {
    alert(`No se pudo importar el respaldo: ${err.message}`);
  } finally {
    elInputRespaldo.value = ""; // permite volver a elegir el mismo archivo
  }
}

// ===== Arranque =====

/** Descarga deck.json, carga el progreso y empieza la sesión. */
async function cargarMazo() {
  try {
    // cache: "no-cache" = pregunta siempre al servidor si hay una versión nueva.
    // (Sin internet, el service worker responde con la copia guardada.)
    const respuesta = await fetch("deck.json", { cache: "no-cache" });
    if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);
    const datos = await respuesta.json(); // convierte el texto JSON en una lista de objetos
    mazo = validarMazo(datos);            // solo usamos tarjetas con el formato correcto
    progreso = cargarProgreso();
    iniciarSesion();
  } catch (err) {
    elContador.textContent = "";
    elVistaRepaso.hidden = true;
    elError.hidden = false;
    elError.textContent = `No se pudieron cargar las tarjetas (${err.message}).`;
  }
}

/** Registra el service worker (sw.js) para que la app funcione sin internet. */
function registrarServiceWorker() {
  // "in" pregunta si el navegador soporta service workers (como hasattr en Python).
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker
      .register("sw.js")
      .catch((err) => console.error("No se pudo registrar el service worker:", err));
  }
  // Pide al navegador que no borre nuestros datos si el teléfono se queda sin espacio.
  if (navigator.storage && navigator.storage.persist) {
    navigator.storage.persist();
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

document.getElementById("btn-exportar").addEventListener("click", exportarRespaldo);
// El botón "Importar" abre el selector de archivos oculto; al elegir uno, se dispara "change".
document.getElementById("btn-importar").addEventListener("click", () => elInputRespaldo.click());
elInputRespaldo.addEventListener("change", importarRespaldo);

// El iPhone deja la app "dormida" en memoria. Al volver a abrirla (por ejemplo,
// al día siguiente) desde la vista final, recalculamos qué tarjetas tocan hoy.
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && !elVistaFin.hidden && mazo.length > 0) {
    iniciarSesion();
  }
});

// ¡Arranque!
registrarServiceWorker();
cargarMazo();
