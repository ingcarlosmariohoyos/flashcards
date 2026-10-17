"""
csv_a_json.py
-------------
Lee data/palabras.csv, valida su contenido y exporta docs/deck.json (la
carpeta que publica GitHub Pages). deck.json es el archivo que leerá la PWA en el
iPhone, así que su formato debe quedar estable.

Validaciones:
  - Ninguna palabra en inglés repetida (comparación sin importar mayúsculas).
  - Ningún campo vacío en ninguna fila.
  - El CSV debe tener exactamente las columnas esperadas.

Uso:
    py scripts/csv_a_json.py
"""

from __future__ import annotations

import csv
import json
import sys
from dataclasses import asdict, dataclass
from pathlib import Path

# Rutas relativas a la raíz del proyecto (independiente de dónde se ejecute).
RAIZ = Path(__file__).resolve().parent.parent
CSV_ENTRADA = RAIZ / "data" / "palabras.csv"
JSON_SALIDA = RAIZ / "docs" / "deck.json"  # docs/ = carpeta publicada en GitHub Pages

COLUMNAS_ESPERADAS = ["palabra", "significado", "oracion_ejemplo", "emoji"]


@dataclass
class Tarjeta:
    """Una tarjeta de vocabulario. 'id' se asigna según el orden del CSV."""

    id: int
    palabra: str
    significado: str
    oracion_ejemplo: str
    emoji: str


def leer_filas(ruta_csv: Path) -> list[dict[str, str]]:
    """Lee el CSV y devuelve una lista de diccionarios (una por fila)."""
    with ruta_csv.open(encoding="utf-8-sig", newline="") as archivo:
        lector = csv.DictReader(archivo)

        if lector.fieldnames != COLUMNAS_ESPERADAS:
            raise ValueError(
                f"Las columnas del CSV no coinciden.\n"
                f"  Esperadas: {COLUMNAS_ESPERADAS}\n"
                f"  Encontradas: {lector.fieldnames}"
            )

        return list(lector)


def validar_filas(filas: list[dict[str, str]]) -> None:
    """Revisa duplicados y campos vacíos. Lanza ValueError con detalles si falla."""
    errores: list[str] = []
    palabras_vistas: dict[str, int] = {}  # palabra en minúsculas -> número de fila

    for numero_fila, fila in enumerate(filas, start=2):  # fila 1 = encabezado
        for columna in COLUMNAS_ESPERADAS:
            if not fila[columna].strip():
                errores.append(f"Fila {numero_fila}: columna '{columna}' está vacía.")

        palabra_normalizada = fila["palabra"].strip().lower()
        if palabra_normalizada in palabras_vistas:
            fila_anterior = palabras_vistas[palabra_normalizada]
            errores.append(
                f"Fila {numero_fila}: '{fila['palabra']}' ya aparece en la fila {fila_anterior}."
            )
        else:
            palabras_vistas[palabra_normalizada] = numero_fila

    if errores:
        mensaje = "\n".join(errores)
        raise ValueError(f"Se encontraron {len(errores)} error(es) en el CSV:\n{mensaje}")


def construir_tarjetas(filas: list[dict[str, str]]) -> list[Tarjeta]:
    """Convierte las filas validadas en objetos Tarjeta con un id secuencial."""
    return [
        Tarjeta(
            id=indice,
            palabra=fila["palabra"].strip(),
            significado=fila["significado"].strip(),
            oracion_ejemplo=fila["oracion_ejemplo"].strip(),
            emoji=fila["emoji"].strip(),
        )
        for indice, fila in enumerate(filas, start=1)
    ]


def guardar_json(tarjetas: list[Tarjeta], ruta_salida: Path) -> None:
    """Exporta la lista de tarjetas a JSON, legible y con tildes/ñ intactas."""
    datos = [asdict(tarjeta) for tarjeta in tarjetas]
    with ruta_salida.open("w", encoding="utf-8") as archivo:
        json.dump(datos, archivo, ensure_ascii=False, indent=2)
        archivo.write("\n")


def main() -> None:
    try:
        filas = leer_filas(CSV_ENTRADA)
        validar_filas(filas)
        tarjetas = construir_tarjetas(filas)
        guardar_json(tarjetas, JSON_SALIDA)
    except (ValueError, FileNotFoundError) as error:
        print(f"ERROR: {error}", file=sys.stderr)
        sys.exit(1)

    print(f"OK: {len(tarjetas)} tarjetas exportadas a {JSON_SALIDA.relative_to(RAIZ)}")


if __name__ == "__main__":
    main()
