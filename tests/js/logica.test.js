/*
  logica.test.js
  --------------
  Pruebas unitarias de docs/logica.js con el ejecutor de pruebas que trae Node.
  Ejecutar desde la raíz del proyecto:   node --test "tests/js/*.test.js"

  Equivalencias con pytest:
    test("nombre", fn)              -> def test_nombre():
    assert.equal(a, b)              -> assert a == b
    assert.deepEqual(a, b)          -> assert a == b   (compara listas/objetos por contenido)
    assert.throws(fn, /texto/)      -> with pytest.raises(..., match="texto"):
*/

import { test, mock } from "node:test";
import assert from "node:assert/strict";
import { barajar, validarMazo } from "../../docs/logica.js";

/** Crea una tarjeta válida; "cambios" sobrescribe campos (como un fixture de pytest). */
function tarjeta(cambios = {}) {
  return {
    id: 1,
    palabra: "hello",
    significado: "hola",
    oracion_ejemplo: "Hello, how are you?",
    emoji: "👋",
    ...cambios, // "..." copia las claves de cambios encima, como {**base, **cambios}
  };
}

// ===== barajar =====

test("barajar conserva los mismos elementos", () => {
  const original = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const barajada = barajar(original);
  // toSorted devuelve una copia ordenada, como sorted() de Python.
  assert.deepEqual(barajada.toSorted((a, b) => a - b), original);
});

test("barajar no modifica la lista original", () => {
  const original = [1, 2, 3, 4, 5];
  barajar(original);
  assert.deepEqual(original, [1, 2, 3, 4, 5]);
});

test("barajar funciona con listas vacías y de un elemento", () => {
  assert.deepEqual(barajar([]), []);
  assert.deepEqual(barajar(["a"]), ["a"]);
});

test("barajar cambia el orden (con muchos elementos)", () => {
  const original = Array.from({ length: 50 }, (_, i) => i); // [0, 1, ..., 49]
  // La probabilidad de que 50 elementos queden en el mismo orden es casi cero.
  assert.notDeepEqual(barajar(original), original);
});

// ===== validarMazo =====

test("validarMazo acepta un mazo correcto", () => {
  const mazo = [tarjeta(), tarjeta({ id: 2, palabra: "bye" })];
  assert.deepEqual(validarMazo(mazo), mazo);
});

test("validarMazo descarta tarjetas mal formadas y conserva las buenas", (t) => {
  // Silenciamos console.warn durante la prueba (como unittest.mock.patch).
  const aviso = t.mock.method(console, "warn", () => {});
  const buena = tarjeta();
  const mazo = [
    buena,
    null,                          // no es un objeto
    5,                             // no es un objeto
    tarjeta({ palabra: "" }),      // campo vacío
    tarjeta({ significado: "  " }),// solo espacios
    tarjeta({ emoji: 123 }),       // no es texto
    { palabra: "solo palabra" },   // faltan campos
  ];
  assert.deepEqual(validarMazo(mazo), [buena]);
  assert.equal(aviso.mock.callCount(), 1); // avisó una vez en la consola
});

test("validarMazo lanza error si no es una lista", () => {
  for (const datos of [{}, "hola", null, 42]) {
    assert.throws(() => validarMazo(datos), /no contiene una lista/);
  }
});

test("validarMazo lanza error si no queda ninguna tarjeta válida", () => {
  mock.method(console, "warn", () => {});
  assert.throws(() => validarMazo([]), /no tiene tarjetas válidas/);
  assert.throws(() => validarMazo([null, { palabra: "x" }]), /no tiene tarjetas válidas/);
  mock.restoreAll();
});
