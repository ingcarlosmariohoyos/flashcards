"""
Pruebas unitarias de scripts/csv_a_json.py.

Ejecutar desde la raíz del proyecto:   py -m pytest
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

import csv_a_json as cj

ENCABEZADO = "palabra,significado,oracion_ejemplo,emoji\n"


def fila(palabra: str = "hello", **cambios: str) -> dict[str, str]:
    """Crea una fila válida del CSV; los kwargs sobrescriben columnas."""
    base = {
        "palabra": palabra,
        "significado": "hola",
        "oracion_ejemplo": "Hello there!",
        "emoji": "👋",
    }
    return {**base, **cambios}


def escribir_csv(tmp_path: Path, contenido: str, encoding: str = "utf-8") -> Path:
    """Escribe un CSV temporal y devuelve su ruta."""
    ruta = tmp_path / "palabras.csv"
    ruta.write_text(contenido, encoding=encoding)
    return ruta


# ===== leer_filas =====


def test_leer_filas_lee_csv_valido(tmp_path):
    ruta = escribir_csv(tmp_path, ENCABEZADO + "hello,hola,Hello there!,👋\n")
    assert cj.leer_filas(ruta) == [fila()]


def test_leer_filas_tolera_bom_de_excel(tmp_path):
    # Excel guarda los CSV en UTF-8 con BOM; "utf-8-sig" debe ignorarlo.
    ruta = escribir_csv(tmp_path, ENCABEZADO + "hello,hola,Hello there!,👋\n", "utf-8-sig")
    assert cj.leer_filas(ruta)[0]["palabra"] == "hello"


def test_leer_filas_rechaza_columnas_incorrectas(tmp_path):
    ruta = escribir_csv(tmp_path, "palabra,significado\nhello,hola\n")
    with pytest.raises(ValueError, match="columnas"):
        cj.leer_filas(ruta)


# ===== validar_filas =====


def test_validar_filas_acepta_filas_correctas():
    cj.validar_filas([fila("hello"), fila("bye")])  # no debe lanzar error


def test_validar_filas_detecta_duplicados_sin_importar_mayusculas():
    with pytest.raises(ValueError, match="ya aparece en la fila 2"):
        cj.validar_filas([fila("hello"), fila(" Hello ")])


@pytest.mark.parametrize("columna", cj.COLUMNAS_ESPERADAS)
def test_validar_filas_detecta_campos_vacios(columna):
    # parametrize ejecuta esta prueba una vez por cada columna.
    with pytest.raises(ValueError, match=f"columna '{columna}' está vacía"):
        cj.validar_filas([fila(**{columna: "   "})])


def test_validar_filas_reporta_todos_los_errores_juntos():
    with pytest.raises(ValueError, match="3 error"):
        cj.validar_filas([fila("a", emoji=""), fila("b", significado=""), fila("A")])


# ===== construir_tarjetas =====


def test_construir_tarjetas_asigna_ids_y_limpia_espacios():
    tarjetas = cj.construir_tarjetas([fila("  hello "), fila("bye", significado=" adiós ")])
    assert [t.id for t in tarjetas] == [1, 2]
    assert tarjetas[0].palabra == "hello"
    assert tarjetas[1].significado == "adiós"


# ===== guardar_json =====


def test_guardar_json_escribe_utf8_sin_escapar(tmp_path):
    salida = tmp_path / "deck.json"
    cj.guardar_json(cj.construir_tarjetas([fila("ñandú", significado="avestruz", emoji="🐦")]), salida)

    texto = salida.read_text(encoding="utf-8")
    assert "ñandú" in texto and "🐦" in texto  # sin \uXXXX (ensure_ascii=False)
    assert json.loads(texto) == [
        {"id": 1, "palabra": "ñandú", "significado": "avestruz",
         "oracion_ejemplo": "Hello there!", "emoji": "🐦"}
    ]


# ===== Datos reales =====


def test_el_csv_real_del_proyecto_es_valido():
    """Si alguien edita data/palabras.csv y lo rompe, esta prueba lo detecta."""
    filas = cj.leer_filas(cj.CSV_ENTRADA)
    cj.validar_filas(filas)
    assert len(filas) > 0
