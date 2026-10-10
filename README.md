# Flashcards de inglés 🇬🇧

App personal de flashcards para aprender vocabulario en inglés (nivel B1),
pensada para usarse sin internet desde el iPhone.

## Cómo funciona (arquitectura)

1. **Python** (este repo, en mi PC): gestiono las palabras en
   `data/palabras.csv` y las exporto a `deck.json` con un script.
2. **GitHub**: puente entre mi PC y el teléfono. Publico `deck.json` y
   (más adelante) la app web aquí.
3. **PWA en el iPhone**: app web instalada desde Safari, funciona offline
   y guarda mi progreso en el teléfono.

## Estructura del repo

```
flashcard-app/
├── data/
│   └── palabras.csv       # palabras, significado, oración de ejemplo, emoji
├── scripts/
│   └── csv_a_json.py      # valida el CSV y genera deck.json
├── deck.json               # salida generada (no se edita a mano)
└── CLAUDE.md               # notas del proyecto para trabajar con Claude Code
```

## Cómo generar deck.json

```powershell
py scripts/csv_a_json.py
```

El script valida que no haya palabras duplicadas ni campos vacíos en el
CSV, y si todo está bien, genera `deck.json`.

## Estado del proyecto

- [x] Viernes 1: estructura del repo, CSV con 40 palabras y script de exportación.
- [ ] Viernes 2: PWA básica (tarjeta, voltear, botones) en GitHub Pages.
- [ ] Viernes 3: modo offline (service worker) y repetición espaciada (Leitner).
- [ ] Viernes 4: pronunciación, estadísticas e imágenes.
- [ ] Viernes 5+ (opcional): sincronización entre PC y celular con Supabase.

Detalle de cada fase y decisiones técnicas en [`CLAUDE.md`](./CLAUDE.md).
