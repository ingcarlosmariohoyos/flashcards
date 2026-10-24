# Proyecto: App de flashcards para vocabulario en inglés

Quiero construir mi propia app de flashcards para aprender vocabulario en inglés.
Soy ingeniero de sistemas y data engineer; sé Python bien, pero casi nada de
HTML/CSS/JS. Mi nivel de inglés es B1 y quiero mejorar mi vocabulario conversacional.

## Entorno de trabajo
- Windows, VS Code, terminal PowerShell.
- Git para Windows instalado. Usaré GitHub (cuenta gratuita) para el repositorio.
- Trabajo con Claude Code desde la terminal integrada de VS Code.

## Contexto y restricciones
- Uso personal (solo para mí, por ahora).
- Tengo iPhone y NO tengo Mac, así que no quiero pasar por la App Store.
- Costo cero: solo herramientas y servicios gratuitos.
- Mi PC NO debe estar prendido para que la app funcione.
- Debe funcionar SIN internet (por ejemplo, en el bus).
- Le dedico solo los viernes, así que el trabajo debe ir por fases cortas.
- Puedo aprender un poco de HTML/JS, pero el código de la interfaz debe ser
  sencillo, bien comentado y escrito por ti; yo solo lo ajusto.

## Arquitectura definida
1. Python (en mi PC) = "taller" de contenido:
   - Gestiono las palabras en un CSV.
   - Un script valida (sin duplicados ni campos vacíos) y exporta deck.json.
   - Más adelante: script que busca imágenes en la API gratuita de Pixabay
     y las comprime a WebP (~20-40 KB) con Pillow.
2. GitHub = puente: repositorio gratuito donde publico deck.json y la app.
3. App en el iPhone = PWA estática en GitHub Pages:
   - Se agrega a la pantalla de inicio desde Safari.
   - Service worker para funcionar offline.
   - Guarda las tarjetas y el progreso en el teléfono (IndexedDB o localStorage).
   - Cuando hay internet, descarga el deck.json actualizado sin borrar mi progreso.
   - Botón para exportar/importar un respaldo del progreso (JSON).

## Contenido de cada tarjeta
- Palabra en inglés
- Significado en español
- Oración de ejemplo en inglés
- Imagen opcional: emoji al inicio y, más adelante, imagen WebP
- Pronunciación con la voz integrada del iPhone (Web Speech API, offline)

## Funcionalidad
- Sesión de repaso: ver la palabra → voltear la tarjeta → calificar
  ("fácil" / "difícil" / "no la sabía").
- Repetición espaciada con el sistema Leitner (que se pueda migrar a SM-2 después).
- La app decide qué tarjetas tocan hoy.
- Estadísticas básicas: palabras aprendidas, racha y tarjetas pendientes.
- Diseño móvil, limpio, con botones grandes para usar con una mano.

## Plan por fases (un viernes por fase)
- Viernes 1: estructura del repo, CSV de ejemplo, script de Python
  (CSV → deck.json) y primeras 30-50 palabras con emojis.
- Viernes 2: PWA básica (tarjeta, voltear, botones) publicada en GitHub Pages
  y agregada a la pantalla de inicio del iPhone.
- Viernes 3: modo offline (service worker) y sistema Leitner con progreso guardado.
- Viernes 4: pronunciación con audio, estadísticas e imágenes con Pixabay.
- Viernes 5+ (opcional): sincronizar el progreso entre PC y celular con el
  plan gratuito de Supabase.

## Cómo quiero que me ayudes
- Trabajemos una fase a la vez; al empezar cada sesión, dime en qué fase vamos.
- Antes de crear o modificar archivos, explícame brevemente el plan.
- Escribe código completo y comentado, en español.
- Incluye los pasos exactos para probar cada fase en mi PC y en mi iPhone.
- Cada vez que implementes algo, escribe sus pruebas unitarias y ejecútalas antes de
  darlo por terminado: Python con pytest en `tests/python/` (`py -m pytest`), y la lógica
  de la app en `docs/logica.js` (funciones puras, sin DOM) con Node en `tests/js/`
  (`node --test "tests/js/*.test.js"`).
- Si una decisión técnica tiene alternativas, recomiéndame una y dime por qué.
- Sé eficiente: no explores ni leas archivos que no sean necesarios.
- Al terminar cada sesión, actualiza la sección "Estado del proyecto" de este archivo.

## Modo aprendizaje
Quiero aprender mientras construimos, no solo obtener código.
- Después de cada archivo nuevo, explícame en 3-5 líneas qué hace y los
  conceptos clave que usa.
- Python lo domino: no expliques lo básico; enfócate en lo nuevo
  (librerías o patrones que no conozca).
- HTML/CSS/JS es nuevo para mí: explica los conceptos la primera vez que
  aparezcan (por ejemplo, qué es el DOM, un evento o un service worker),
  con analogías de Python o de datos cuando sea posible.
- No repitas explicaciones de conceptos que ya vimos en sesiones anteriores.
- Si escribo "explícame más", profundiza en ese tema.
- Al final de cada sesión, agrega 2-3 conceptos aprendidos a la sección
  "Conceptos aprendidos" de este archivo.

## Estado del proyecto
- Fase actual: Viernes 3 (implementado; falta confirmar la prueba en el iPhone)
- Completado:
  - Viernes 1: `data/palabras.csv` (40 palabras), `scripts/csv_a_json.py`, repo en GitHub
    (`ingcarlosmariohoyos/flashcards`).
  - Viernes 2: PWA básica en `docs/` (carpeta publicada en GitHub Pages):
    `index.html`, `estilos.css`, `app.js`, `manifest.json` e `icono.png`.
    `scripts/generar_icono.py` (Pillow) y `requirements.txt`.
  - Viernes 3:
    - `docs/sw.js`: service worker (app offline; archivos con stale-while-revalidate,
      `deck.json` con network-first y límite de 3 s). Subir `VERSION` si la app queda pegada.
    - `docs/logica.js`: funciones puras (barajar, validarMazo, fechas, Leitner 5 cajas
      1-2-4-8-16 días, máximo 10 nuevas/día, validarProgreso, revisarTamanoRespaldo).
    - `docs/app.js`: solo pantalla; progreso en localStorage (`flashcards.progreso`),
      clave por palabra en minúsculas (no por id); respaldo exportar/importar en la vista final.
    - Correcciones: sin scroll (100dvh), sin menú al mantener pulsado, CSP en `index.html`.
    - Pruebas unitarias: `tests/python/` (pytest) y `tests/js/` (node:test). 51 pruebas.
    - `desinstalar-app.md`: cómo quitar la app del iPhone.
- Pendiente / notas:
  - App publicada en https://ingcarlosmariohoyos.github.io/flashcards/ (Pages: rama `main`, carpeta `/docs`).
  - En esta PC, `python` no está en el PATH; usar `py` (ej. `py scripts/csv_a_json.py`).
  - Prueba local: `cd docs; py -m http.server 8000` → http://localhost:8000
    (en F12 → Application → Service workers, activar "Update on reload" al desarrollar).
  - Pruebas: `py -m pytest` y `node --test "tests/js/*.test.js"`.
  - Confirmar en el iPhone: modo avión, progreso guardado y exportar respaldo.
  - Siguiente fase: Viernes 4 — pronunciación (Web Speech API), estadísticas (racha,
    aprendidas, pendientes) e imágenes con Pixabay (clave en `.env`, ya ignorado por git).

## Conceptos aprendidos
- `csv.DictReader`: lee cada fila del CSV como diccionario usando el encabezado como claves; evita indexar columnas por número.
- `dataclass` (`@dataclass`): forma concisa de definir una clase con campos tipados (aquí `Tarjeta`), similar a un `NamedTuple` pero mutable; `asdict()` la convierte a diccionario para volcarla a JSON.
- `json.dump(..., ensure_ascii=False)`: sin esto, Python escaparía tildes/ñ/emoji como `\uXXXX` en el JSON; con `ensure_ascii=False` se escriben los caracteres reales (hay que guardar el archivo en UTF-8).
- DOM y eventos: el HTML se convierte en un árbol de objetos (DOM) que JS modifica (`textContent`, `classList`, `hidden`); `addEventListener("click", fn)` registra una función que se ejecuta cuando ocurre el evento, parecido a un callback.
- `fetch` + `async/await`: descarga archivos de forma asíncrona, como `asyncio`. No funciona abriendo el HTML con doble clic (`file://`) por seguridad del navegador; por eso se prueba con `py -m http.server`.
- PWA en iPhone: `manifest.json` + metas `apple-*` + `apple-touch-icon` hacen que "Agregar a inicio" abra la web a pantalla completa con su propio ícono, sin App Store.
- Service worker: script que el navegador instala aparte de la página e intercepta cada petición (`fetch`); con la Cache API guarda copias para funcionar offline. Es como una capa de caché delante de una API, con una política por tipo de archivo.
- localStorage: diccionario del navegador que solo guarda texto y sobrevive al cerrar la app; se usa con `JSON.stringify`/`JSON.parse` (≈ `json.dumps`/`json.loads`).
- Módulos JS (`export`/`import`) y funciones puras: separar la lógica (`logica.js`) de la pantalla (`app.js`) permite probarla con `node:test`, el equivalente de pytest en Node.
