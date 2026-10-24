/*
  sw.js — Service worker
  ----------------------
  Un service worker es un script que el navegador instala APARTE de la página y
  que se queda "en medio" entre la app e internet: cada vez que la app pide un
  archivo (evento "fetch"), este script decide si lo trae de internet o de una
  copia guardada en el teléfono (la Cache). Gracias a eso la app abre sin señal.

  Analogía de datos: es como una capa de caché delante de una API; tú eliges
  la política (primero caché, primero red...) para cada tipo de archivo.

  Estrategias:
    - Archivos de la app (HTML, CSS, JS, ícono): "stale-while-revalidate".
      Se entregan al instante desde la caché y, si hay internet, se actualizan
      en segundo plano. Los cambios que subas se ven la SIGUIENTE vez que abras la app.
    - deck.json: "network-first". Primero intenta internet (máximo 3 s) para
      traer palabras nuevas; si no hay señal, usa la copia guardada.

  IMPORTANTE: si algún día la app queda "pegada" en una versión vieja, sube el
  número de VERSION: eso borra la caché anterior y descarga todo de nuevo.
*/

const VERSION = "v1";
const NOMBRE_CACHE = `flashcards-${VERSION}`;

// Archivos que se guardan apenas se instala el service worker.
// Las rutas son relativas a la ubicación de sw.js ("./" = la página principal).
const ARCHIVOS_APP = [
  "./",
  "index.html",
  "estilos.css",
  "app.js",
  "logica.js",
  "manifest.json",
  "icono.png",
  "deck.json",
];

const ESPERA_RED_MS = 3000; // en el bus la señal puede ser lenta: no esperamos más de 3 s

// ===== Instalación: se ejecuta una vez por cada VERSION nueva =====
// "self" es el propio service worker (aquí no existe "window" ni "document").
self.addEventListener("install", (evento) => {
  // waitUntil = "no termines la instalación hasta que esta promesa acabe".
  evento.waitUntil(
    caches
      .open(NOMBRE_CACHE)
      .then((cache) => cache.addAll(ARCHIVOS_APP))
      .then(() => self.skipWaiting()) // activa esta versión sin esperar a cerrar la app
  );
});

// ===== Activación: limpia las cachés de versiones anteriores =====
self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((nombres) =>
        Promise.all(
          nombres
            .filter((nombre) => nombre !== NOMBRE_CACHE)
            .map((nombre) => caches.delete(nombre))
        )
      )
      .then(() => self.clients.claim()) // toma el control de la página ya abierta
  );
});

// ===== Cada petición de la app pasa por aquí =====
self.addEventListener("fetch", (evento) => {
  const peticion = evento.request;
  const url = new URL(peticion.url);

  // Solo manejamos lecturas (GET) de nuestro propio sitio; lo demás pasa directo.
  if (peticion.method !== "GET" || url.origin !== self.location.origin) return;

  if (url.pathname.endsWith("/deck.json")) {
    evento.respondWith(primeroRed(peticion));
  } else {
    evento.respondWith(cacheYActualizar(peticion));
  }
});

/** Stale-while-revalidate: responde con la caché y actualiza en segundo plano. */
async function cacheYActualizar(peticion) {
  const cache = await caches.open(NOMBRE_CACHE);
  // ignoreSearch: "index.html?x=1" usa la misma copia que "index.html".
  const guardada = await cache.match(peticion, { ignoreSearch: true });

  const descarga = fetch(peticion)
    .then((respuesta) => {
      if (respuesta.ok) cache.put(peticion, respuesta.clone()); // clone: una respuesta solo se lee una vez
      return respuesta;
    })
    .catch(() => undefined); // sin internet: no pasa nada, ya tenemos la copia

  // Si hay copia, se entrega ya; si no (primera vez), esperamos la descarga.
  return guardada || (await descarga) || new Response("Sin conexión", { status: 503 });
}

/** Network-first con tiempo límite: intenta internet y, si falla o tarda, usa la caché. */
async function primeroRed(peticion) {
  const cache = await caches.open(NOMBRE_CACHE);
  try {
    const respuesta = await conTiempoLimite(fetch(peticion), ESPERA_RED_MS);
    if (respuesta.ok) {
      await cache.put(peticion, respuesta.clone());
      return respuesta;
    }
    throw new Error(`HTTP ${respuesta.status}`);
  } catch {
    const guardada = await cache.match(peticion, { ignoreSearch: true });
    return guardada || new Response("Sin conexión", { status: 503 });
  }
}

/** Rechaza la promesa si tarda más de "ms" milisegundos (como asyncio.wait_for). */
function conTiempoLimite(promesa, ms) {
  return Promise.race([
    promesa,
    new Promise((_, rechazar) => setTimeout(() => rechazar(new Error("tiempo agotado")), ms)),
  ]);
}
