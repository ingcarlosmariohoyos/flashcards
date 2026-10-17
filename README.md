# Flashcards de inglés 🇬🇧

App personal de flashcards para aprender vocabulario en inglés (nivel B1),
pensada para usarse sin internet desde el iPhone.

👉 **App publicada:** https://ingcarlosmariohoyos.github.io/flashcards/

## Cómo funciona (arquitectura)

1. **Python** (este repo, en mi PC): gestiono las palabras en
   `data/palabras.csv` y las exporto a `docs/deck.json` con un script.
2. **GitHub**: puente entre mi PC y el teléfono. GitHub Pages publica la
   carpeta `docs/` (la app web + `deck.json`).
3. **PWA en el iPhone**: app web agregada a la pantalla de inicio desde
   Safari; (desde el Viernes 3) funcionará offline y guardará mi progreso
   en el teléfono.

## Estructura del repo

```
flashcard-app/
├── data/
│   └── palabras.csv        # palabras, significado, oración de ejemplo, emoji
├── scripts/
│   ├── csv_a_json.py       # valida el CSV y genera docs/deck.json
│   └── generar_icono.py    # genera docs/icono.png con Pillow
├── docs/                   # carpeta publicada en GitHub Pages (la app)
│   ├── index.html          # estructura de la app
│   ├── estilos.css         # diseño móvil
│   ├── app.js              # lógica: cargar, voltear, calificar
│   ├── manifest.json       # datos de la PWA (nombre, ícono, colores)
│   ├── icono.png           # ícono de la pantalla de inicio (generado)
│   └── deck.json           # tarjetas (generado, no se edita a mano)
├── requirements.txt        # dependencias de Python
└── CLAUDE.md               # notas del proyecto para trabajar con Claude Code
```

## Uso

```powershell
# Instalar dependencias (una sola vez)
py -m pip install -r requirements.txt

# Regenerar las tarjetas después de editar data/palabras.csv
py scripts/csv_a_json.py

# Probar la app en el PC: http://localhost:8000
cd docs
py -m http.server 8000
```

El script valida que no haya palabras duplicadas ni campos vacíos en el
CSV, y si todo está bien, genera `docs/deck.json`. Tras un `git push`, la
app publicada se actualiza en 1-2 minutos.

## Estado del proyecto

- [x] Viernes 1: estructura del repo, CSV con 40 palabras y script de exportación.
- [x] Viernes 2: PWA básica (tarjeta, voltear, botones) en GitHub Pages.
- [ ] Viernes 3: modo offline (service worker) y repetición espaciada (Leitner).
- [ ] Viernes 4: pronunciación, estadísticas e imágenes.
- [ ] Viernes 5+ (opcional): sincronización entre PC y celular con Supabase.

Detalle de cada fase y decisiones técnicas en [`CLAUDE.md`](./CLAUDE.md).
