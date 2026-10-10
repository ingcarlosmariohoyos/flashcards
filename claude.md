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
- Fase actual: Viernes 1 (completado)
- Completado:
  - Estructura del repo: `data/`, `scripts/`, `.gitignore`.
  - `data/palabras.csv` con 40 palabras B1 (palabra, significado, oracion_ejemplo, emoji).
  - `scripts/csv_a_json.py`: valida duplicados/campos vacíos y exporta `deck.json`.
  - `deck.json` generado (40 tarjetas) y repo git inicializado con primer commit.
- Pendiente / notas:
  - Aún no se sube a GitHub (falta crear el repo remoto y hacer push).
  - En esta PC, `python` no está en el PATH; usar `py` en su lugar (ej. `py scripts/csv_a_json.py`).
  - Siguiente fase: Viernes 2 — PWA básica (tarjeta, voltear, botones) en GitHub Pages.

## Conceptos aprendidos
- `csv.DictReader`: lee cada fila del CSV como diccionario usando el encabezado como claves; evita indexar columnas por número.
- `dataclass` (`@dataclass`): forma concisa de definir una clase con campos tipados (aquí `Tarjeta`), similar a un `NamedTuple` pero mutable; `asdict()` la convierte a diccionario para volcarla a JSON.
- `json.dump(..., ensure_ascii=False)`: sin esto, Python escaparía tildes/ñ/emoji como `\uXXXX` en el JSON; con `ensure_ascii=False` se escriben los caracteres reales (hay que guardar el archivo en UTF-8).