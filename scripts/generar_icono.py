"""
generar_icono.py
----------------
Genera docs/icono.png (512x512): el ícono que el iPhone muestra en la
pantalla de inicio. Fondo índigo con degradado vertical y el texto "Aa".

El iPhone redondea las esquinas por su cuenta, así que el ícono se dibuja
cuadrado y sin transparencia (iOS pinta de negro las zonas transparentes).

Uso:
    py scripts/generar_icono.py
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

RAIZ = Path(__file__).resolve().parent.parent
SALIDA = RAIZ / "docs" / "icono.png"

TAMANO = 512
COLOR_ARRIBA = (99, 102, 241)  # índigo claro
COLOR_ABAJO = (67, 56, 202)    # índigo oscuro
TEXTO = "Aa"

# Fuentes en negrita de Windows, en orden de preferencia.
FUENTES = ["C:/Windows/Fonts/segoeuib.ttf", "C:/Windows/Fonts/arialbd.ttf"]


def cargar_fuente(tamano: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    """Devuelve la primera fuente disponible; si ninguna existe, la de Pillow."""
    for ruta in FUENTES:
        if Path(ruta).exists():
            return ImageFont.truetype(ruta, tamano)
    return ImageFont.load_default(size=tamano)


def degradado_vertical(tamano: int, arriba: tuple, abajo: tuple) -> Image.Image:
    """Crea un degradado: una línea horizontal por fila, interpolando el color."""
    img = Image.new("RGB", (tamano, tamano))
    dibujo = ImageDraw.Draw(img)
    for y in range(tamano):
        t = y / (tamano - 1)
        color = tuple(round(a + (b - a) * t) for a, b in zip(arriba, abajo))
        dibujo.line([(0, y), (tamano, y)], fill=color)
    return img


def main() -> None:
    img = degradado_vertical(TAMANO, COLOR_ARRIBA, COLOR_ABAJO)
    dibujo = ImageDraw.Draw(img)
    fuente = cargar_fuente(int(TAMANO * 0.45))

    # anchor="mm" centra el texto en el punto dado (middle-middle).
    dibujo.text((TAMANO / 2, TAMANO / 2), TEXTO, font=fuente, fill="white", anchor="mm")

    SALIDA.parent.mkdir(parents=True, exist_ok=True)
    img.save(SALIDA, optimize=True)
    print(f"OK: ícono guardado en {SALIDA.relative_to(RAIZ)}")


if __name__ == "__main__":
    main()
