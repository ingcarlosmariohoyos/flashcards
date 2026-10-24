/*
  leitner.test.js
  ---------------
  Pruebas de las fechas, el sistema Leitner y la validación del progreso (docs/logica.js).
  Ejecutar desde la raíz del proyecto:   node --test "tests/js/*.test.js"

  Las funciones reciben "hoy" como parámetro, así que podemos simular cualquier
  día sin esperar ni cambiar el reloj del PC.
*/

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  fechaISO,
  sumarDias,
  claveTarjeta,
  progresoVacio,
  estadoDe,
  calificarTarjeta,
  tarjetasDeHoy,
  registrarRespuesta,
  validarProgreso,
  revisarTamanoRespaldo,
  TAMANO_MAXIMO_RESPALDO,
  NUEVAS_POR_DIA,
} from "../../docs/logica.js";

const HOY = "2026-10-23";

/** Crea una tarjeta mínima con la palabra indicada. */
function tarjeta(palabra) {
  return { palabra, significado: "x", oracion_ejemplo: "x", emoji: "🙂" };
}

/** Crea un progreso con los estados indicados: { palabra: { caja, proximo } }. */
function progresoCon(tarjetas, nuevasHoy = { fecha: "", cantidad: 0 }) {
  return { version: 1, tarjetas, nuevasHoy };
}

// describe agrupa pruebas relacionadas (como una clase TestAlgo en pytest).
describe("fechas", () => {
  test("fechaISO rellena con ceros el mes y el día", () => {
    assert.equal(fechaISO(new Date(2026, 0, 5)), "2026-01-05"); // mes 0 = enero
  });

  test("sumarDias cruza meses y años", () => {
    assert.equal(sumarDias("2026-10-31", 1), "2026-11-01");
    assert.equal(sumarDias("2026-12-31", 1), "2027-01-01");
    assert.equal(sumarDias("2026-10-23", 16), "2026-11-08");
  });

  test("sumarDias respeta los años bisiestos", () => {
    assert.equal(sumarDias("2028-02-28", 1), "2028-02-29"); // 2028 es bisiesto
    assert.equal(sumarDias("2026-02-28", 1), "2026-03-01"); // 2026 no
  });

  test("sumarDias acepta días negativos", () => {
    assert.equal(sumarDias("2026-11-01", -1), "2026-10-31");
  });
});

describe("claveTarjeta", () => {
  test("usa la palabra en minúsculas y sin espacios", () => {
    assert.equal(claveTarjeta(tarjeta("  Hello ")), "hello");
  });
});

describe("calificarTarjeta (reglas de Leitner)", () => {
  test("una palabra nueva calificada fácil pasa a la caja 2 (repaso en 2 días)", () => {
    assert.deepEqual(calificarTarjeta(undefined, "facil", HOY), {
      caja: 2, proximo: "2026-10-25", repasos: 1,
    });
  });

  test("una palabra nueva difícil o no sabida queda en la caja 1 (mañana)", () => {
    for (const calificacion of ["dificil", "no_sabia"]) {
      const estado = calificarTarjeta(undefined, calificacion, HOY);
      assert.equal(estado.caja, 1);
      assert.equal(estado.proximo, "2026-10-24");
    }
  });

  test("fácil sube una caja y usa el intervalo de la nueva caja", () => {
    const estado = calificarTarjeta({ caja: 3, proximo: HOY, repasos: 4 }, "facil", HOY);
    assert.deepEqual(estado, { caja: 4, proximo: "2026-10-31", repasos: 5 }); // caja 4 = 8 días
  });

  test("fácil en la caja 5 se queda en la 5 (16 días)", () => {
    const estado = calificarTarjeta({ caja: 5, proximo: HOY, repasos: 9 }, "facil", HOY);
    assert.equal(estado.caja, 5);
    assert.equal(estado.proximo, "2026-11-08");
  });

  test("difícil se queda en su caja", () => {
    const estado = calificarTarjeta({ caja: 3, proximo: HOY, repasos: 1 }, "dificil", HOY);
    assert.equal(estado.caja, 3);
    assert.equal(estado.proximo, "2026-10-27"); // caja 3 = 4 días
  });

  test("no la sabía vuelve a la caja 1", () => {
    const estado = calificarTarjeta({ caja: 4, proximo: HOY, repasos: 6 }, "no_sabia", HOY);
    assert.equal(estado.caja, 1);
    assert.equal(estado.proximo, "2026-10-24");
  });

  test("una calificación desconocida lanza error", () => {
    assert.throws(() => calificarTarjeta(undefined, "regular", HOY), /desconocida/);
  });
});

describe("tarjetasDeHoy", () => {
  test("incluye las pendientes de hoy y atrasadas, pero no las futuras", () => {
    const mazo = [tarjeta("hoy"), tarjeta("atrasada"), tarjeta("futura")];
    const progreso = progresoCon({
      hoy: { caja: 1, proximo: HOY, repasos: 1 },
      atrasada: { caja: 2, proximo: "2026-10-01", repasos: 1 },
      futura: { caja: 3, proximo: "2026-10-24", repasos: 1 },
    });
    const { pendientes, nuevas } = tarjetasDeHoy(mazo, progreso, HOY);
    assert.deepEqual(pendientes.map((t) => t.palabra), ["hoy", "atrasada"]);
    assert.deepEqual(nuevas, []);
  });

  test("limita las nuevas al máximo diario y respeta el orden del CSV", () => {
    const mazo = Array.from({ length: 25 }, (_, i) => tarjeta(`p${i}`));
    const { nuevas } = tarjetasDeHoy(mazo, progresoVacio(), HOY);
    assert.equal(nuevas.length, NUEVAS_POR_DIA);
    assert.equal(nuevas[0].palabra, "p0");
  });

  test("descuenta las nuevas ya vistas hoy", () => {
    const mazo = Array.from({ length: 25 }, (_, i) => tarjeta(`p${i}`));
    const progreso = progresoCon({}, { fecha: HOY, cantidad: 7 });
    assert.equal(tarjetasDeHoy(mazo, progreso, HOY).nuevas.length, 3);
  });

  test("el cupo de nuevas se reinicia al día siguiente", () => {
    const mazo = Array.from({ length: 25 }, (_, i) => tarjeta(`p${i}`));
    const progreso = progresoCon({}, { fecha: "2026-10-22", cantidad: 10 });
    assert.equal(tarjetasDeHoy(mazo, progreso, HOY).nuevas.length, 10);
  });

  test("una palabra que coincide con una clave interna de JS ('constructor') es nueva", () => {
    const { nuevas } = tarjetasDeHoy([tarjeta("constructor")], progresoVacio(), HOY);
    assert.equal(nuevas.length, 1);
  });

  test("las palabras agregadas al deck entran como nuevas sin tocar el progreso", () => {
    const progreso = progresoCon({ hello: { caja: 3, proximo: "2026-10-30", repasos: 2 } });
    const mazoActualizado = [tarjeta("hello"), tarjeta("goodbye")];
    const { pendientes, nuevas } = tarjetasDeHoy(mazoActualizado, progreso, HOY);
    assert.deepEqual(pendientes, []);
    assert.deepEqual(nuevas.map((t) => t.palabra), ["goodbye"]);
    assert.equal(estadoDe(progreso, "hello").caja, 3);
  });
});

describe("registrarRespuesta", () => {
  test("guarda el estado de la palabra y cuenta las nuevas del día", () => {
    const p1 = registrarRespuesta(progresoVacio(), tarjeta("Hello"), "facil", HOY);
    assert.equal(estadoDe(p1, "hello").caja, 2);
    assert.deepEqual(p1.nuevasHoy, { fecha: HOY, cantidad: 1 });

    const p2 = registrarRespuesta(p1, tarjeta("bye"), "dificil", HOY);
    assert.deepEqual(p2.nuevasHoy, { fecha: HOY, cantidad: 2 });
  });

  test("repasar una palabra ya conocida no cuenta como nueva", () => {
    const progreso = progresoCon(
      { hello: { caja: 2, proximo: HOY, repasos: 1 } },
      { fecha: HOY, cantidad: 4 }
    );
    const nuevo = registrarRespuesta(progreso, tarjeta("hello"), "facil", HOY);
    assert.deepEqual(nuevo.nuevasHoy, { fecha: HOY, cantidad: 4 });
    assert.equal(estadoDe(nuevo, "hello").caja, 3);
  });

  test("no modifica el progreso original (devuelve uno nuevo)", () => {
    const original = progresoVacio();
    registrarRespuesta(original, tarjeta("hello"), "facil", HOY);
    assert.deepEqual(original, progresoVacio());
  });
});

describe("validarProgreso", () => {
  test("acepta un progreso válido (ida y vuelta por JSON)", () => {
    const progreso = registrarRespuesta(progresoVacio(), tarjeta("hello"), "facil", HOY);
    assert.deepEqual(validarProgreso(JSON.parse(JSON.stringify(progreso))), progreso);
  });

  test("rechaza archivos que no son un respaldo", () => {
    for (const datos of [null, [], "hola", 5, {}]) {
      assert.throws(() => validarProgreso(datos));
    }
  });

  test("rechaza versiones desconocidas", () => {
    assert.throws(() => validarProgreso({ version: 99, tarjetas: {} }), /versión/);
  });

  test("descarta entradas mal formadas y conserva las buenas", () => {
    const resultado = validarProgreso({
      version: 1,
      tarjetas: {
        buena: { caja: 2, proximo: "2026-10-25", repasos: 1 },
        caja_cero: { caja: 0, proximo: "2026-10-25" },
        caja_seis: { caja: 6, proximo: "2026-10-25" },
        caja_texto: { caja: "2", proximo: "2026-10-25" },
        fecha_mala: { caja: 2, proximo: "25/10/2026" },
        nula: null,
      },
    });
    assert.deepEqual(Object.keys(resultado.tarjetas), ["buena"]);
  });

  test("ignora la clave peligrosa __proto__", () => {
    const datos = JSON.parse(
      '{"version":1,"tarjetas":{"__proto__":{"caja":1,"proximo":"2026-10-25"}}}'
    );
    const resultado = validarProgreso(datos);
    assert.deepEqual(Object.keys(resultado.tarjetas), []);
    assert.equal(Object.getPrototypeOf(resultado.tarjetas), Object.prototype);
  });

  test("si falta nuevasHoy o es inválido, usa el valor por defecto", () => {
    const resultado = validarProgreso({ version: 1, tarjetas: {}, nuevasHoy: "mal" });
    assert.deepEqual(resultado.nuevasHoy, { fecha: "", cantidad: 0 });
  });

  test("nuevasHoy con una fecha mal escrita usa el valor por defecto", () => {
    const resultado = validarProgreso({
      version: 1,
      tarjetas: {},
      nuevasHoy: { fecha: "ayer", cantidad: 3 },
    });
    assert.deepEqual(resultado.nuevasHoy, { fecha: "", cantidad: 0 });
  });
});

describe("revisarTamanoRespaldo", () => {
  test("acepta archivos de hasta 1 MB", () => {
    revisarTamanoRespaldo(500); // no debe lanzar error
    revisarTamanoRespaldo(TAMANO_MAXIMO_RESPALDO);
  });

  test("rechaza archivos de más de 1 MB", () => {
    assert.throws(() => revisarTamanoRespaldo(TAMANO_MAXIMO_RESPALDO + 1), /demasiado grande/);
  });
});
